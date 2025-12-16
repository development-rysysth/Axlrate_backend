import { Request, Response } from 'express';
import { FetchRatesRequestBody, SearchHotelRequestBody } from '../../../../shared/types';
import { fetchHotelRates, searchHotelWithLocation } from '../collectors/serpapi-collector';
import { transformSerpApiResponse } from '../transformers/serpapi-transformer';
import { CountryRepository } from '../repositories/country-repository';
import { formatHotelQuery, formatDate } from '../utils/formatters';
import { validateFetchRates, fetchRatesSchema } from '../../validators/serpapi';
import { hotels } from '../../../../shared/constants';

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

      return res.json({
        success: true,
        data: ratesData,
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

      return res.json({
        success: true,
        data: ratesData,
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

          results.push({
            hotelName,
            checkIn: todayStr,
            checkOut: checkoutStr,
            success: true,
          });
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
    // This endpoint is deprecated - calendar data is now handled by aggregator-service
    // which queries the rates table directly
    return res.status(410).json({ 
      success: false, 
      error: 'This endpoint has been deprecated. Please use the aggregator-service /v1/calendar-data endpoint instead.' 
    });
  }

  /**
   * GET /countries
   * Fetch all countries from database
   * Returns: Array of countries with id, name, and code (code needed for gl parameter lookup)
   */
  async getCountries(_req: Request, res: Response) {
    try {
      const repository = new CountryRepository();
      const countries = await repository.getAllCountries();

      // Format response for frontend - return id, name, and code
      const formattedCountries = countries
        .filter((country) => country.id !== undefined)
        .map((country) => ({
          id: country.id!,
          name: country.name,
          code: country.code,
        }));

      return res.json({
        success: true,
        count: formattedCountries.length,
        data: formattedCountries,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Database pool not initialized')) {
        return res.status(500).json({
          error: 'Database not initialized',
          message: 'Database connection must be established',
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch countries',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /states?countryCode=US
   * Fetch states by country code from database
   * Returns: Array of states with id and name (removed code from response, using name only)
   */
  async getStates(req: Request, res: Response) {
    try {
      const countryCode = req.query.countryCode as string;

      if (!countryCode) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Query parameter "countryCode" is required'],
        });
      }

      const repository = new CountryRepository();
      const states = await repository.getStatesByCountryCode(countryCode);

      // Format response for frontend - only return id and name (removed code)
      const formattedStates = states
        .filter((state) => state.id !== undefined)
        .map((state) => ({
          id: state.id!,
          name: state.name,
        }));

      return res.json({
        success: true,
        count: formattedStates.length,
        data: formattedStates,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Database pool not initialized')) {
        return res.status(500).json({
          error: 'Database not initialized',
          message: 'Database connection must be established',
        });
      }

      if (errorMessage.includes('required')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: errorMessage,
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch states',
        message: errorMessage,
      });
    }
  }

  /**
   * POST /search-hotel
   * Search hotel using SerpAPI with country code and state name
   * Accepts: hotelName, countryCode, stateName, checkInDate, checkOutDate, optional params
   */
  async searchHotel(req: Request, res: Response) {
    try {
      const {
        hotelName,
        countryCode,
        stateName,
        checkInDate,
        checkOutDate,
        hl,
        currency,
        adults,
      } = req.body as SearchHotelRequestBody;

      // Validate adults (default to 2, accept 2, 3, 4, 5)
      const adultsCount = adults !== undefined ? Number(adults) : 2;
      if (adults !== undefined && (isNaN(adultsCount) || adultsCount < 2 || adultsCount > 5 || !Number.isInteger(adultsCount))) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['adults must be an integer between 2 and 5 (default: 2)'],
        });
      }

      console.log('Searching hotel');

      // Format dates
      const formattedCheckIn = formatDate(checkInDate);
      const formattedCheckOut = formatDate(checkOutDate);

      // Search hotel from SerpAPI
      const ratesData = await searchHotelWithLocation({
        hotelName,
        countryCode,
        stateName,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        hl: hl || 'en',
        currency: currency || 'USD',
        adults: adultsCount,
      });

      // Transform SerpAPI response to SerpData format
      const hotelQuery = `${hotelName} ${stateName}`;
      const transformedData = transformSerpApiResponse(ratesData, {
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl: countryCode.toLowerCase(),
        hl: hl || 'en',
        currency: currency || 'USD',
        adults: adultsCount,
      });

      // Extract only: type, name, GPS coordinates, hotelclass
      let filteredData = null;
      
      if (ratesData?.properties) {
        if (Array.isArray(ratesData.properties)) {
          // Multiple properties - return array with only required fields
          filteredData = ratesData.properties.map((property: any) => ({
            type: property.type,
            name: property.name,
            gps_coordinates: property.gps_coordinates,
            hotel_class: property.hotel_class,
          }));
        } else {
          // Single property object - return only required fields
          filteredData = {
            type: ratesData.properties.type,
            name: ratesData.properties.name,
            gps_coordinates: ratesData.properties.gps_coordinates,
            hotel_class: ratesData.properties.hotel_class,
          };
        }
      } else if (transformedData) {
        // Use transformed data - return only required fields
        filteredData = {
          type: transformedData.type,
          name: transformedData.name,
          gps_coordinates: transformedData.gps_coordinates,
          hotel_class: transformedData.hotel_class,
        };
      }

      if (filteredData) {
        if (Array.isArray(filteredData) && filteredData.length > 0) {
          console.log(`Hotel found: ${filteredData.length} result(s)`);
        } else if (filteredData.name) {
          console.log(`Hotel found: ${filteredData.name}`);
        }
      } else {
        console.log('Hotel not found');
      }

      return res.json({
        success: true,
        data: filteredData,
        query: {
          hotelName,
          countryCode,
          stateName,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          hl: hl || 'en',
          currency: currency || 'USD',
          adults: adultsCount,
        },
      });
    } catch (error: unknown) {
      console.error('Search hotel error:', error);
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

      if (errorMessage.includes('not found')) {
        return res.status(404).json({
          error: 'Location not found',
          message: errorMessage,
        });
      }

      return res.status(500).json({
        error: 'Failed to search hotel',
        message: errorMessage,
      });
    }
  }
}

