import { Request, Response } from 'express';
import { FetchRatesRequestBody } from '../../../../shared/types';
import { fetchHotelRates } from '../collectors/serpapi-collector';
import { transformSerpApiResponse } from '../transformers/serpapi-transformer';
import { SerpDataRepository } from '../repositories/serpdata-repository';
import { formatHotelQuery, formatDate } from '../utils/formatters';
import { validateFetchRates, fetchRatesSchema } from '../../validators/serpapi';
import { hotels } from '../../../../shared/constants';

const serpDataRepository = new SerpDataRepository();

export class SerpApiController {
  async fetchRates(req: Request, res: Response) {
    try {
      const {
        hotelName,
        checkInDate,
        checkOutDate,
        gl,
        hl,
        currency,
        adults,
      } = req.body as FetchRatesRequestBody;

      // Validate adults (default to 2, accept 2, 3, 4, 5)
      const adultsCount = adults !== undefined ? Number(adults) : 2;
      if (adults !== undefined && (isNaN(adultsCount) || adultsCount < 2 || adultsCount > 5 || !Number.isInteger(adultsCount))) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['adults must be an integer between 2 and 5 (default: 2)'],
        });
      }

      // Format hotel query
      const hotelQuery = formatHotelQuery(hotelName);

      // Format dates
      const formattedCheckIn = formatDate(checkInDate);
      const formattedCheckOut = formatDate(checkOutDate);

      // Fetch rates from SerpAPI
      const ratesData = await fetchHotelRates({
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl,
        hl,
        currency,
        adults: adultsCount,
      });

      // Transform SerpAPI response to SerpData format
      const transformedData = transformSerpApiResponse(ratesData, {
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl: gl || 'us',
        hl: hl || 'en',
        currency: currency || 'USD',
        adults: adultsCount,
      });

      // Save to database
      let savedSerpData = null;
      try {
        const checkInDateObj = new Date(formattedCheckIn);
        const checkOutDateObj = new Date(formattedCheckOut);
        const checkInStart = new Date(checkInDateObj);
        checkInStart.setHours(0, 0, 0, 0);
        const checkInEnd = new Date(checkInDateObj);
        checkInEnd.setHours(23, 59, 59, 999);
        const checkOutStart = new Date(checkOutDateObj);
        checkOutStart.setHours(0, 0, 0, 0);
        const checkOutEnd = new Date(checkOutDateObj);
        checkOutEnd.setHours(23, 59, 59, 999);
        
        const existingData = await serpDataRepository.findOne({
          $or: [
            { property_token: transformedData.property_token },
            { name: transformedData.name },
          ],
          'search_parameters.check_in_date': {
            $gte: checkInStart,
            $lte: checkInEnd,
          },
          'search_parameters.check_out_date': {
            $gte: checkOutStart,
            $lte: checkOutEnd,
          },
          'search_parameters.adults': adultsCount,
        });

        if (existingData) {
          Object.assign(existingData, transformedData);
          savedSerpData = await existingData.save();
          console.log('[POST /serpapi/fetch-rates] Updated existing SerpData, _id:', savedSerpData._id?.toString());
        } else {
          savedSerpData = await serpDataRepository.create(transformedData);
          console.log('[POST /serpapi/fetch-rates] Created new SerpData, _id:', savedSerpData._id?.toString());
        }
      } catch (dbError: unknown) {
        console.error('Database save error:', dbError);
        // Continue even if database save fails
      }

      return res.json({
        success: true,
        data: ratesData,
        savedToDatabase: !!savedSerpData,
        databaseId: savedSerpData?._id || null,
        query: {
          hotelName,
          hotelQuery,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          gl,
          hl,
          currency,
        },
      });
    } catch (error: unknown) {
      console.error('Fetch rates error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('SERP_API_KEY')) {
        return res.status(500).json({
          error: 'SerpAPI configuration error',
          message: errorMessage,
        });
      }

      if (errorMessage.includes('Invalid date')) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: errorMessage,
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch hotel rates',
        message: errorMessage,
      });
    }
  }

  async fetchRatesGet(req: Request, res: Response) {
    try {
      const {
        q,
        check_in_date,
        check_out_date,
        gl,
        hl,
        currency,
        adults
      } = req.query;

      // Validate required parameters
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Query parameter "q" (hotel name) is required'],
        });
      }

      if (!check_in_date || typeof check_in_date !== 'string') {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Query parameter "check_in_date" is required (format: YYYY-MM-DD)'],
        });
      }

      if (!check_out_date || typeof check_out_date !== 'string') {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Query parameter "check_out_date" is required (format: YYYY-MM-DD)'],
        });
      }

      // Validate adults if provided
      let adultsCount = 2;
      if (adults !== undefined) {
        const parsedAdults = Number(adults);
        if (isNaN(parsedAdults) || parsedAdults < 2 || parsedAdults > 5 || !Number.isInteger(parsedAdults)) {
          return res.status(400).json({
            error: 'Validation failed',
            details: ['adults must be an integer between 2 and 5 (default: 2)'],
          });
        }
        adultsCount = parsedAdults;
      }

      // Convert query parameters to request body format
      const requestBody: FetchRatesRequestBody = {
        hotelName: q.replace(/\+/g, ' '),
        checkInDate: check_in_date,
        checkOutDate: check_out_date,
        gl: (gl as string) || 'us',
        hl: (hl as string) || 'en',
        currency: (currency as string) || 'USD',
      };

      // Validate the converted body
      const { error, value } = fetchRatesSchema.validate(requestBody, {
        abortEarly: false,
      });

      if (error) {
        const errors = error.details.map((detail: { message: string }) => detail.message);
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      const {
        hotelName,
        checkInDate,
        checkOutDate,
        gl: validatedGl,
        hl: validatedHl,
        currency: validatedCurrency,
      } = value;

      // Format hotel query and dates
      const hotelQuery = formatHotelQuery(hotelName);
      const formattedCheckIn = formatDate(checkInDate);
      const formattedCheckOut = formatDate(checkOutDate);

      // Fetch rates from SerpAPI
      const ratesData = await fetchHotelRates({
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl: validatedGl,
        hl: validatedHl,
        currency: validatedCurrency,
        adults: adultsCount,
      });

      // Transform SerpAPI response to SerpData format
      const transformedData = transformSerpApiResponse(ratesData, {
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl: validatedGl || 'us',
        hl: validatedHl || 'en',
        currency: validatedCurrency || 'USD',
        adults: adultsCount,
      });

      // Save to DB
      let savedSerpData = null;
      try {
        const checkInDateObj = new Date(formattedCheckIn);
        const checkOutDateObj = new Date(formattedCheckOut);
        const checkInStart = new Date(checkInDateObj);
        checkInStart.setHours(0, 0, 0, 0);
        const checkInEnd = new Date(checkInDateObj);
        checkInEnd.setHours(23, 59, 59, 999);
        const checkOutStart = new Date(checkOutDateObj);
        checkOutStart.setHours(0, 0, 0, 0);
        const checkOutEnd = new Date(checkOutDateObj);
        checkOutEnd.setHours(23, 59, 59, 999);
        
        const existingData = await serpDataRepository.findOne({
          $or: [
            { property_token: transformedData.property_token },
            { name: transformedData.name },
          ],
          'search_parameters.check_in_date': {
            $gte: checkInStart,
            $lte: checkInEnd,
          },
          'search_parameters.check_out_date': {
            $gte: checkOutStart,
            $lte: checkOutEnd,
          },
          'search_parameters.adults': adultsCount,
        });

        if (existingData) {
          Object.assign(existingData, transformedData);
          savedSerpData = await existingData.save();
        } else {
          savedSerpData = await serpDataRepository.create(transformedData);
        }
      } catch (dbError: unknown) {
        console.error('Database save error:', dbError);
      }

      return res.json({
        success: true,
        data: ratesData,
        savedToDatabase: !!savedSerpData,
        databaseId: savedSerpData?._id || null,
        query: {
          hotelName,
          hotelQuery,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          gl: validatedGl,
          hl: validatedHl,
          currency: validatedCurrency,
        },
      });
    } catch (error: unknown) {
      console.error('Fetch rates error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('SERP_API_KEY')) {
        return res.status(500).json({
          error: 'SerpAPI configuration error',
          message: errorMessage,
        });
      }

      if (errorMessage.includes('Invalid date')) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: errorMessage,
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch hotel rates',
        message: errorMessage,
      });
    }
  }

  async batchFetchRates(req: Request, res: Response) {
    try {
      const { checkInDate, checkOutDate, adults } = req.body;
      const results: any[] = [];

      // Validate checkInDate
      if (!checkInDate) {
        return res.status(400).json({ success: false, error: "checkInDate is required" });
      }

      const today = new Date(checkInDate);
      if (isNaN(today.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid checkInDate format" });
      }

      // Validate checkOutDate
      if (!checkOutDate) {
        return res.status(400).json({ success: false, error: "checkOutDate is required" });
      }

      const checkout = new Date(checkOutDate);
      if (isNaN(checkout.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid checkOutDate format" });
      }

      // Validate that checkOutDate is after checkInDate
      if (checkout <= today) {
        return res.status(400).json({ 
          success: false, 
          error: "checkOutDate must be after checkInDate" 
        });
      }

      // Validate adults
      const adultsCount = adults !== undefined ? Number(adults) : 2;
      if (isNaN(adultsCount) || adultsCount < 2 || adultsCount > 5 || !Number.isInteger(adultsCount)) {
        return res.status(400).json({ 
          success: false, 
          error: "adults must be an integer between 2 and 5 (default: 2)" 
        });
      }

      const todayStr = formatDate(today);
      const checkoutStr = formatDate(checkout);

      console.log(`\n[BATCH FETCH] Starting for ${hotels.length} hotels.`);
      console.log(`[BATCH FETCH] Date range: ${todayStr} → ${checkoutStr}`);
      console.log(`[BATCH FETCH] Adults: ${adultsCount}`);

      for (const hotel of hotels) {
        const hotelName = hotel.name;
        console.log(`\n[BATCH FETCH] Processing: ${hotelName}`);

        try {
          const hotelQuery = formatHotelQuery(hotelName);

          // Fetch SerpAPI Data
          const ratesData = await fetchHotelRates({
            hotelQuery,
            checkInDate: todayStr,
            checkOutDate: checkoutStr,
            gl: 'us',
            hl: 'en',
            currency: 'USD',
            adults: adultsCount
          });

          const transformed = transformSerpApiResponse(ratesData, {
            hotelQuery,
            checkInDate: todayStr,
            checkOutDate: checkoutStr,
            gl: 'us',
            hl: 'en',
            currency: 'USD',
            adults: adultsCount
          });

          let savedDoc = null;

          try {
            const checkInDateObj = new Date(todayStr);
            const checkOutDateObj = new Date(checkoutStr);
            const checkInStart = new Date(checkInDateObj);
            checkInStart.setHours(0, 0, 0, 0);
            const checkInEnd = new Date(checkInDateObj);
            checkInEnd.setHours(23, 59, 59, 999);
            const checkOutStart = new Date(checkOutDateObj);
            checkOutStart.setHours(0, 0, 0, 0);
            const checkOutEnd = new Date(checkOutDateObj);
            checkOutEnd.setHours(23, 59, 59, 999);
            
            const existingData = await serpDataRepository.findOne({
              $or: [
                { property_token: transformed.property_token },
                { name: transformed.name },
              ],
              'search_parameters.check_in_date': {
                $gte: checkInStart,
                $lte: checkInEnd,
              },
              'search_parameters.check_out_date': {
                $gte: checkOutStart,
                $lte: checkOutEnd,
              },
              'search_parameters.adults': adultsCount,
            });

            if (existingData) {
              Object.assign(existingData, transformed);
              savedDoc = await existingData.save();
              console.log(`[DB] Updated existing record for ${hotelName} (${todayStr} -> ${checkoutStr})`);
            } else {
              savedDoc = await serpDataRepository.create(transformed);
              console.log(`[DB] Created new record for ${hotelName} (${todayStr} -> ${checkoutStr})`);
            }

            results.push({
              hotelName,
              checkIn: todayStr,
              checkOut: checkoutStr,
              success: true,
              databaseId: savedDoc?._id || null,
              updated: !!existingData
            });
          } catch (dbError: any) {
            console.error(`\n❌ [DB ERROR] FAILED to save ${hotelName}`);
            results.push({
              hotelName,
              checkIn: todayStr,
              checkOut: checkoutStr,
              success: false,
              error: dbError.message,
            });
            continue;
          }
        } catch (fetchError: any) {
          console.error(`\n❌ [FETCH ERROR] Failed to fetch rates for ${hotelName}`);
          results.push({
            hotelName,
            checkIn: todayStr,
            checkOut: checkoutStr,
            success: false,
            error: fetchError.message,
          });
        }

        // Rate Limit Protection
        await new Promise(res => setTimeout(res, 1000));
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      console.log(`\n[BATCH FETCH] Completed: ${successCount} ✓  /  ${failureCount} ✗`);

      return res.json({
        success: true,
        message: `Batch fetch completed`,
        successCount,
        failureCount,
        results,
      });
    } catch (fatalError: any) {
      console.error("\n🔥 FATAL BATCH ERROR:", fatalError);
      return res.status(500).json({
        success: false,
        error: "Fatal server error",
        message: fatalError.message,
      });
    }
  }

  async getCalendarData(_req: Request, res: Response) {
    try {
      const data = await serpDataRepository.findAllSummaries();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch calendar data' });
    }
  }
}

