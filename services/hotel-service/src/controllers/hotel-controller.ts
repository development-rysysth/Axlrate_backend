import { Request, Response } from 'express';
import { FetchRatesRequestBody, SearchHotelRequestBody } from '../../../../shared/types';
import { CountryRepository } from '../repositories/country-repository';
import { HotelRateRepository } from '../repositories/hotel-rate-repository';
import { formatDate } from '../utils/formatters';

export class HotelController {
  async fetchRates(req: Request, res: Response) {
    try {
      const {
        hotelName,
        checkInDate,
        checkOutDate,
        country,
        state,
        city,
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

      // Format dates if provided
      const formattedCheckIn = checkInDate ? formatDate(checkInDate) : undefined;
      const formattedCheckOut = checkOutDate ? formatDate(checkOutDate) : undefined;

      const repository = new HotelRateRepository();
      
      // Search hotels from database
      const hotels = await repository.searchHotelsByName(
        hotelName,
        country,
        state,
        city
      );

      if (hotels.length === 0) {
        return res.json({
          success: true,
          data: {
            hotels: [],
            totalResults: 0
          },
          query: {
            hotelName,
            checkInDate: formattedCheckIn,
            checkOutDate: formattedCheckOut,
            country,
            state,
            city,
          }
        });
      }

      // Get rates for all matching hotels
      const transformedData = [];
      for (const hotel of hotels) {
        const ratesData = await repository.getHotelRatesFromRates(
          hotel.id,
          formattedCheckIn,
          formattedCheckOut,
          adultsCount
        );

        // Transform to match expected response format
        const rates = ratesData.map(rate => ({
          date: rate.date || rate.check_in_date,
          price: parseFloat(rate.price?.toString() || '0'),
          currency: rate.currency || 'USD',
          ota: rate.ota || 'unknown',
          roomType: rate.room_type || undefined,
          availability: rate.availability !== false, // Default to true if not specified
        }));

        transformedData.push({
          name: hotel.name,
          location: `${hotel.city}, ${hotel.state}, ${hotel.country}`,
          rating: hotel.star_rating,
          gps_coordinates: {
            latitude: hotel.latitude,
            longitude: hotel.longitude
          },
          hotel_class: hotel.star_rating?.toString(),
          rates: rates
        });
      }

      return res.json({
        success: true,
        data: {
          hotels: transformedData,
          totalResults: transformedData.length
        },
        query: {
          hotelName,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          country,
          state,
          city,
        }
      });
    } catch (error: unknown) {
      console.error('Fetch rates error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Invalid date')) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: errorMessage,
        });
      }

      if (errorMessage.includes('Database pool not initialized')) {
        return res.status(500).json({
          error: 'Database not initialized',
          message: 'Database connection must be established',
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
        country,
        state,
        city,
        adults
      } = req.query;

      // Validate required parameters
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Query parameter "q" (hotel name) is required'],
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
        checkInDate: check_in_date as string,
        checkOutDate: check_out_date as string,
        country: country as string,
        state: state as string,
        city: city as string,
        adults: adultsCount,
      };

      // Use the same logic as POST endpoint
      const {
        hotelName,
        checkInDate,
        checkOutDate,
        country: countryFilter,
        state: stateFilter,
        city: cityFilter,
        adults: adultsParam,
      } = requestBody;

      // Format dates if provided
      const formattedCheckIn = checkInDate ? formatDate(checkInDate) : undefined;
      const formattedCheckOut = checkOutDate ? formatDate(checkOutDate) : undefined;

      const repository = new HotelRateRepository();
      
      // Search hotels from database
      const hotels = await repository.searchHotelsByName(
        hotelName,
        countryFilter,
        stateFilter,
        cityFilter
      );

      if (hotels.length === 0) {
        return res.json({
          success: true,
          data: {
            hotels: [],
            totalResults: 0
          },
          query: {
            hotelName,
            checkInDate: formattedCheckIn,
            checkOutDate: formattedCheckOut,
            country: countryFilter,
            state: stateFilter,
            city: cityFilter,
          }
        });
      }

      // Get rates for all matching hotels
      const transformedData = [];
      for (const hotel of hotels) {
        const ratesData = await repository.getHotelRatesFromRates(
          hotel.id,
          formattedCheckIn,
          formattedCheckOut,
          adultsParam
        );

        // Transform to match expected response format
        const rates = ratesData.map(rate => ({
          date: rate.date || rate.check_in_date,
          price: parseFloat(rate.price?.toString() || '0'),
          currency: rate.currency || 'USD',
          ota: rate.ota || 'unknown',
          roomType: rate.room_type || undefined,
          availability: rate.availability !== false,
        }));

        transformedData.push({
          name: hotel.name,
          location: `${hotel.city}, ${hotel.state}, ${hotel.country}`,
          rating: hotel.star_rating,
          gps_coordinates: {
            latitude: hotel.latitude,
            longitude: hotel.longitude
          },
          hotel_class: hotel.star_rating?.toString(),
          rates: rates
        });
      }

      return res.json({
        success: true,
        data: {
          hotels: transformedData,
          totalResults: transformedData.length
        },
        query: {
          hotelName,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          country: countryFilter,
          state: stateFilter,
          city: cityFilter,
        }
      });
    } catch (error: unknown) {
      console.error('Fetch rates error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Invalid date')) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: errorMessage,
        });
      }

      if (errorMessage.includes('Database pool not initialized')) {
        return res.status(500).json({
          error: 'Database not initialized',
          message: 'Database connection must be established',
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

      const repository = new HotelRateRepository();
      const hotels = await repository.getAllActiveHotels();

      console.log(`\n[BATCH FETCH] Starting for ${hotels.length} hotels.`);
      console.log(`[BATCH FETCH] Date range: ${todayStr} → ${checkoutStr}`);
      console.log(`[BATCH FETCH] Adults: ${adultsCount}`);

      for (const hotel of hotels) {
        const hotelName = hotel.name;
        console.log(`\n[BATCH FETCH] Processing: ${hotelName}`);

        try {
          // Get rates for this hotel
          const ratesData = await repository.getHotelRatesFromRates(
            hotel.id,
            todayStr,
            checkoutStr,
            adultsCount
          );

          results.push({
            hotelName,
            checkIn: todayStr,
            checkOut: checkoutStr,
            success: true,
            ratesCount: ratesData.length,
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

        // Small delay to avoid overwhelming database
        await new Promise(res => setTimeout(res, 100));
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
    // This endpoint is deprecated
    return res.status(410).json({ 
      success: false, 
      error: 'This endpoint has been deprecated.' 
    });
  }

  /**
   * GET /countries
   * Fetch all countries from database
   * Returns: Array of countries with id, name, and iso2 (iso2 needed for gl parameter lookup)
   */
  async getCountries(_req: Request, res: Response) {
    try {
      const repository = new CountryRepository();
      const countries = await repository.getAllCountries();

      // Format response for frontend - return id, name, and iso2 (as code for backward compatibility)
      const formattedCountries = countries
        .filter((country) => country.id !== undefined)
        .map((country) => ({
          id: country.id!,
          name: country.name,
          code: country.iso2, // Return iso2 as 'code' for backward compatibility
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
   * GET /cities?stateId=<uuid> OR ?countryCode=<code>&stateName=<name>
   * Fetch cities by state ID or by state name and country code from database
   * Returns: Array of cities with id and name
   */
  async getCities(req: Request, res: Response) {
    try {
      const stateId = req.query.stateId as string;
      const countryCode = req.query.countryCode as string;
      const stateName = req.query.stateName as string;

      // Validate: either stateId OR (countryCode AND stateName) must be provided
      if (!stateId && (!countryCode || !stateName)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [
            'Query parameter "stateId" is required, OR both "countryCode" and "stateName" are required',
          ],
        });
      }

      const repository = new CountryRepository();
      let cities;

      if (stateId) {
        // Get cities by state UUID
        cities = await repository.getCitiesByStateId(stateId);
      } else {
        // Get cities by state name and country code
        cities = await repository.getCitiesByStateAndCountry(stateName!, countryCode!);
      }

      // Format response for frontend - only return id and name
      const formattedCities = cities
        .filter((city) => city.id !== undefined)
        .map((city) => ({
          id: city.id!,
          name: city.name,
        }));

      return res.json({
        success: true,
        count: formattedCities.length,
        data: formattedCities,
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
        error: 'Failed to fetch cities',
        message: errorMessage,
      });
    }
  }

  /**
   * POST /search-hotel
   * Search hotel from database with country code and state name
   * Accepts: hotelName, countryCode, stateName, checkInDate (optional), checkOutDate (optional)
   */
  async searchHotel(req: Request, res: Response) {
    try {
      const {
        hotelName,
        countryCode,
        stateName,
        checkInDate,
        checkOutDate,
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

      // Format dates if provided
      const formattedCheckIn = checkInDate ? formatDate(checkInDate) : undefined;
      const formattedCheckOut = checkOutDate ? formatDate(checkOutDate) : undefined;

      const repository = new HotelRateRepository();
      
      // Get country name from country code (iso2)
      const countryRepo = new CountryRepository();
      const country = await countryRepo.getCountryByCode(countryCode);
      
      if (!country) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [`Country code "${countryCode}" not found`],
        });
      }

      // Search hotels from database
      const hotels = await repository.searchHotelsByName(
        hotelName,
        country.name, // Use country name for filtering
        stateName,
        undefined // city is optional
      );

      if (hotels.length === 0) {
        return res.json({
          success: true,
          data: null,
          query: {
            hotelName,
            countryCode,
            stateName,
            checkInDate: formattedCheckIn,
            checkOutDate: formattedCheckOut,
            adults: adultsCount,
          },
        });
      }

      // Transform to match expected response format (only: type, name, GPS coordinates, hotel_class)
      const filteredData = hotels.map((hotel) => ({
        type: 'lodging', // Default type for hotels
        name: hotel.name,
        gps_coordinates: {
          latitude: hotel.latitude,
          longitude: hotel.longitude,
        },
        hotel_class: hotel.star_rating?.toString() || undefined,
      }));

      if (filteredData.length > 0) {
        console.log(`Hotel found: ${filteredData.length} result(s)`);
      } else {
        console.log('Hotel not found');
      }

      return res.json({
        success: true,
        data: filteredData.length === 1 ? filteredData[0] : filteredData,
        query: {
          hotelName,
          countryCode,
          stateName,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          adults: adultsCount,
        },
      });
    } catch (error: unknown) {
      console.error('Search hotel error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Invalid date')) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: errorMessage,
        });
      }

      if (errorMessage.includes('Database pool not initialized')) {
        return res.status(500).json({
          error: 'Database not initialized',
          message: 'Database connection must be established',
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

