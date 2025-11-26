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
      currency,
      adults
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

    // Validate adults if provided
    let adultsCount = 2; // default
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
      adults: adultsCount,
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
      adults: adultsCount,
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

      // Look for existing entry by hotel name, check-in date, check-out date, and adults
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
      
      const existingData = await SerpData.findOne({
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
      adults,
    } = req.body;

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
      // Log transformed data for debugging (especially total_time_taken)
      console.log('[POST /serpapi/fetch-rates] Transformed data total_time_taken:',
        transformedData.search_metadata?.total_time_taken,
        'Type:', typeof transformedData.search_metadata?.total_time_taken
      );

      // Check if data already exists by hotel name, check-in date, check-out date, and adults
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
      
      const existingData = await SerpData.findOne({
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
app.post('/serpapi/batch-fetch-rates', async (req: Request, res: Response) => {
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

    // Validate adults (default to 2, accept 2, 3, 4, 5)
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

        // ------------------------
        //     SAVE TO DATABASE
        // ------------------------
       try {
  // Check if data already exists by hotel name, check-in date, check-out date, and adults
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
  
  const existingData = await SerpData.findOne({
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
    // Update existing record
    Object.assign(existingData, transformed);
    savedDoc = await existingData.save();
    console.log(
      `[DB] Updated existing record for ${hotelName} (${todayStr} -> ${checkoutStr})`
    );
  } else {
    // Create new record
    savedDoc = await SerpData.create(transformed);
    console.log(
      `[DB] Created new record for ${hotelName} (${todayStr} -> ${checkoutStr})`
    );
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
  console.error(`Message: ${dbError.message}`);
  console.error(`Code: ${dbError.code}`);
  console.error("Field Errors:", dbError.errors);
  console.error("Full Error:", dbError);

  results.push({
    hotelName,
    checkIn: todayStr,
    checkOut: checkoutStr,
    success: false,
    error: dbError.message,
    fieldErrors: dbError.errors,
  });

  continue; // Move to next hotel
}


      } catch (fetchError: any) {
        console.error(`\n❌ [FETCH ERROR] Failed to fetch rates for ${hotelName}`);
        console.error(fetchError);

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
