import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express, { Request, Response } from 'express';
import cors from 'cors';
import { formatHotelQuery, formatDate } from './utils/formatters';
import { fetchHotelRates } from './utils/serpapi';
import { validateFetchRates, fetchRatesSchema } from './validators/serpapi';
import { FetchRatesRequestBody } from '../../shared/types';
import { connectDB } from './config/database';
import SerpData from './models/SerpData';
import { transformSerpApiResponse } from './utils/transformers';
import { fetchSerpDataSummaries } from './utils/serpapi';
import { hotels } from '../../shared/constants';

const app = express();
const PORT = process.env.SERPAPI_SERVICE_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For query parameters

// Debug middleware to log incoming POST requests
app.use((req: Request, _res: Response, next) => {
  if (req.path.includes('fetch-rates') && req.method === 'POST') {
    console.log('[SERPAPI SERVICE] POST /serpapi/fetch-rates received');
    console.log('[SERPAPI SERVICE] Content-Type:', req.get('Content-Type'));
    console.log('[SERPAPI SERVICE] Body after parsing:', req.body);
    console.log('[SERPAPI SERVICE] Body type:', typeof req.body);
    console.log('[SERPAPI SERVICE] Body keys:', req.body ? Object.keys(req.body) : 'no body');
  }
  next();
});

// Debug middleware to log incoming requests
app.use((req: Request, _res: Response, next) => {
  if (req.path.includes('fetch-rates') && req.method === 'POST') {
    console.log('[SERPAPI SERVICE] POST /serpapi/fetch-rates received');
    console.log('[SERPAPI SERVICE] Content-Type:', req.get('Content-Type'));
    console.log('[SERPAPI SERVICE] Raw body (before parsing):', req.body);
    console.log('[SERPAPI SERVICE] Body type:', typeof req.body);
    console.log('[SERPAPI SERVICE] Body keys:', req.body ? Object.keys(req.body) : 'no body');
  }
  next();
});

/**
 * Fetch hotel rates endpoint (GET with query parameters)
 * GET /serpapi/fetch-rates?q=hotel+name&check_in_date=2025-11-21&check_out_date=2025-11-22&gl=us&hl=en&currency=USD
 */
app.get('/serpapi/fetch-rates', async (req: Request, res: Response) => {
  try {
    // Log the entire req.query object so we can see exactly what comes in
    console.log("[GET /serpapi/fetch-rates] Incoming query params:", req.query);
    const {
      q,
      check_in_date,
      check_out_date,
      gl,
      hl,
      currency
    } = req.query;

    // Brief explanation for debugging/learning:
    // These parameters are usually sent as part of the URL, like:
    //   /serpapi/fetch-rates?q=hotel+california&check_in_date=2025-12-01&check_out_date=2025-12-05
    // The 'q' parameter is the hotel name, + signs may represent spaces in the URL.

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

    // Convert query parameters to request body format (matching POST endpoint structure)
    const requestBody: FetchRatesRequestBody = {
      hotelName: q.replace(/\+/g, ' '), // Transform + to space for real hotel name
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      gl: (gl as string) || 'us',
      hl: (hl as string) || 'en',
      currency: (currency as string) || 'USD',
    };

    // Log the "requestBody" as it will be passed to the validator & downstream functions
    // console.log("[GET /serpapi/fetch-rates] Converted requestBody for validation:", requestBody);

    // Validate the converted body using schema (catching multiple errors if present)
    const { error, value } = fetchRatesSchema.validate(requestBody, {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((detail: { message: string }) => detail.message);
      console.log("[GET /serpapi/fetch-rates] Validation errors:", errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Use the validated, sanitized value for further processing
    const {
      hotelName,
      checkInDate,
      checkOutDate,
      gl: validatedGl,
      hl: validatedHl,
      currency: validatedCurrency,
    } = value;

    // Here's how we use the data:
    // - hotelName -> turned into a SerpAPI "q" friendly query
    // - checkInDate/checkOutDate -> passed after formatting
    // - gl, hl, currency -> locale & currency settings for rates

    // Format hotel query and dates
    const hotelQuery = formatHotelQuery(hotelName);
    const formattedCheckIn = formatDate(checkInDate);
    const formattedCheckOut = formatDate(checkOutDate);

    // // Log the formatted data that will be sent to SerpAPI
    // console.log("[GET /serpapi/fetch-rates] Formatted params for fetchHotelRates():", {
    //   hotelQuery,
    //   checkInDate: formattedCheckIn,
    //   checkOutDate: formattedCheckOut,
    //   gl: validatedGl,
    //   hl: validatedHl,
    //   currency: validatedCurrency
    // });

    // Fetch rates from SerpAPI
    const ratesData = await fetchHotelRates({
      hotelQuery,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      gl: validatedGl,
      hl: validatedHl,
      currency: validatedCurrency,
    });

    // Log the raw rates data received from SerpAPI for debug
    console.log("[GET /serpapi/fetch-rates] Received ratesData:", ratesData);

    // Transform SerpAPI response to SerpData format (matches our DB model)
    const transformedData = transformSerpApiResponse(ratesData, {
      hotelQuery,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      gl: validatedGl || 'us',
      hl: validatedHl || 'en',
      currency: validatedCurrency || 'USD',
    });

    // Log the data as it will be stored in DB (if at all)
    // console.log("[GET /serpapi/fetch-rates] Data to store in DB (transformedData):", transformedData);

    // Save to DB, if unique enough (prevent duplicate inserts)
    let savedSerpData = null;
    try {
      // Log transformed data for debugging (especially total_time_taken)
      console.log('[GET /serpapi/fetch-rates] Transformed data total_time_taken:', 
        transformedData.search_metadata?.total_time_taken,
        'Type:', typeof transformedData.search_metadata?.total_time_taken
      );

      // Look for existing entry by metadata.id or property_token
      const existingData = await SerpData.findOne({
        $or: [
          { 'search_metadata.id': transformedData.search_metadata?.id },
          { property_token: transformedData.property_token },
        ],
      });

      if (existingData) {
        Object.assign(existingData, transformedData);
        savedSerpData = await existingData.save();
        console.log("[GET /serpapi/fetch-rates] Updated existing SerpData, _id:", savedSerpData._id?.toString());
      } else {
        savedSerpData = await SerpData.create(transformedData);
        console.log("[GET /serpapi/fetch-rates] Created new SerpData, _id:", savedSerpData._id?.toString());
      }
    } catch (dbError: unknown) {
      console.error('Database save error:', dbError);
      if (dbError instanceof Error) {
        console.error('Error message:', dbError.message);
        if ('errors' in dbError && typeof dbError.errors === 'object') {
          console.error('Validation errors:', JSON.stringify(dbError.errors, null, 2));
        }
      }
      // Not a fatal error—continue to respond with results anyway
    }

    // Return response to client (see which fields come back)
    return res.json({
      success: true,
      data: ratesData, // This is the original SerpAPI data
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

    // Handle specific error types
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
});

/**
 * Fetch hotel rates endpoint
 * POST /serpapi/fetch-rates
 */
app.post('/serpapi/fetch-rates', validateFetchRates, async (req: Request<{}, {}, FetchRatesRequestBody>, res: Response) => {
  try {
    const {
      hotelName,
      checkInDate,
      checkOutDate,
      gl,
      hl,
      currency,
    } = req.body;

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
    });

    // Transform SerpAPI response to SerpData format
    const transformedData = transformSerpApiResponse(ratesData, {
      hotelQuery,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      gl: gl || 'us',
      hl: hl || 'en',
      currency: currency || 'USD',
    });

    // Save to database
    let savedSerpData = null;
    try {
      // Log transformed data for debugging (especially total_time_taken)
      console.log('[POST /serpapi/fetch-rates] Transformed data total_time_taken:', 
        transformedData.search_metadata?.total_time_taken,
        'Type:', typeof transformedData.search_metadata?.total_time_taken
      );

      // Check if data already exists (by search_metadata.id or property_token)
      const existingData = await SerpData.findOne({
        $or: [
          { 'search_metadata.id': transformedData.search_metadata?.id },
          { property_token: transformedData.property_token },
        ],
      });

      if (existingData) {
        // Update existing record
        Object.assign(existingData, transformedData);
        savedSerpData = await existingData.save();
        console.log('[POST /serpapi/fetch-rates] Updated existing SerpData, _id:', savedSerpData._id?.toString());
      } else {
        // Create new record
        savedSerpData = await SerpData.create(transformedData);
        console.log('[POST /serpapi/fetch-rates] Created new SerpData, _id:', savedSerpData._id?.toString());
      }
    } catch (dbError: unknown) {
      console.error('Database save error:', dbError);
      if (dbError instanceof Error) {
        console.error('Error message:', dbError.message);
        if ('errors' in dbError && typeof dbError.errors === 'object') {
          console.error('Validation errors:', JSON.stringify(dbError.errors, null, 2));
        }
      }
      // Continue even if database save fails - still return the API response
      // Log the error but don't fail the request
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
    
    // Handle specific error types
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
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'serpapi-service',
    hasApiKey: !!process.env.SERP_API_KEY,
  });
});

/**
 * Batch fetch rates for all hotels from constants
 * POST /serpapi/batch-fetch-rates
 */
app.post('/serpapi/batch-fetch-rates', async (_req: Request, res: Response) => {
  try {
    const results = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Format dates
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);
    const dayAfterTomorrowStr = formatDate(dayAfterTomorrow);

    console.log(`[BATCH FETCH] Starting batch fetch for ${hotels.length} hotels`);
    console.log(`[BATCH FETCH] Date ranges: ${todayStr} -> ${tomorrowStr}, ${tomorrowStr} -> ${dayAfterTomorrowStr}`);

    // Process each hotel
    for (const hotel of hotels) {
      const hotelName = hotel.name;
      console.log(`[BATCH FETCH] Processing hotel: ${hotelName}`);

      // Fetch rates for today -> tomorrow
      try {
        const hotelQuery1 = formatHotelQuery(hotelName);
        const ratesData1 = await fetchHotelRates({
          hotelQuery: hotelQuery1,
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
        });

        const transformedData1 = transformSerpApiResponse(ratesData1, {
          hotelQuery: hotelQuery1,
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
        });

        let saved1 = null;
        try {
          const existing1 = await SerpData.findOne({
            $or: [
              { 'search_metadata.id': transformedData1.search_metadata?.id },
              { property_token: transformedData1.property_token },
            ],
          });

          if (existing1) {
            Object.assign(existing1, transformedData1);
            saved1 = await existing1.save();
            console.log(`[BATCH FETCH] Updated: ${hotelName} (${todayStr} -> ${tomorrowStr})`);
          } else {
            saved1 = await SerpData.create(transformedData1);
            console.log(`[BATCH FETCH] Created: ${hotelName} (${todayStr} -> ${tomorrowStr})`);
          }
        } catch (dbError) {
          console.error(`[BATCH FETCH] DB error for ${hotelName} (${todayStr} -> ${tomorrowStr}):`, dbError);
        }

        results.push({
          hotelName,
          checkIn: todayStr,
          checkOut: tomorrowStr,
          success: true,
          saved: !!saved1,
          databaseId: saved1?._id?.toString() || null,
        });
      } catch (error) {
        console.error(`[BATCH FETCH] Error fetching rates for ${hotelName} (${todayStr} -> ${tomorrowStr}):`, error);
        results.push({
          hotelName,
          checkIn: todayStr,
          checkOut: tomorrowStr,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Fetch rates for tomorrow -> day after tomorrow
      try {
        const hotelQuery2 = formatHotelQuery(hotelName);
        const ratesData2 = await fetchHotelRates({
          hotelQuery: hotelQuery2,
          checkInDate: tomorrowStr,
          checkOutDate: dayAfterTomorrowStr,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
        });

        const transformedData2 = transformSerpApiResponse(ratesData2, {
          hotelQuery: hotelQuery2,
          checkInDate: tomorrowStr,
          checkOutDate: dayAfterTomorrowStr,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
        });

        let saved2 = null;
        try {
          const existing2 = await SerpData.findOne({
            $or: [
              { 'search_metadata.id': transformedData2.search_metadata?.id },
              { property_token: transformedData2.property_token },
            ],
          });

          if (existing2) {
            Object.assign(existing2, transformedData2);
            saved2 = await existing2.save();
            console.log(`[BATCH FETCH] Updated: ${hotelName} (${tomorrowStr} -> ${dayAfterTomorrowStr})`);
          } else {
            saved2 = await SerpData.create(transformedData2);
            console.log(`[BATCH FETCH] Created: ${hotelName} (${tomorrowStr} -> ${dayAfterTomorrowStr})`);
          }
        } catch (dbError) {
          console.error(`[BATCH FETCH] DB error for ${hotelName} (${tomorrowStr} -> ${dayAfterTomorrowStr}):`, dbError);
        }

        results.push({
          hotelName,
          checkIn: tomorrowStr,
          checkOut: dayAfterTomorrowStr,
          success: true,
          saved: !!saved2,
          databaseId: saved2?._id?.toString() || null,
        });
      } catch (error) {
        console.error(`[BATCH FETCH] Error fetching rates for ${hotelName} (${tomorrowStr} -> ${dayAfterTomorrowStr}):`, error);
        results.push({
          hotelName,
          checkIn: tomorrowStr,
          checkOut: dayAfterTomorrowStr,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Add a small delay between hotels to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[BATCH FETCH] Completed: ${successCount} successful, ${failureCount} failed`);

    return res.json({
      success: true,
      message: `Batch fetch completed: ${successCount} successful, ${failureCount} failed`,
      totalHotels: hotels.length,
      totalRequests: results.length,
      results,
    });
  } catch (error) {
    console.error('[BATCH FETCH] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process batch fetch',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`SerpAPI service running on port ${PORT}`);
      if (!process.env.SERP_API_KEY) {
        console.warn('⚠️  WARNING: SERP_API_KEY is not set in environment variables');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

// GET /api/calendarData
app.get('/api/calendarData', async (_req: Request, res: Response) => {
  try {
    const data = await fetchSerpDataSummaries();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar data' });
  }
});
