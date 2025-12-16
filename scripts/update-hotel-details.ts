#!/usr/bin/env ts-node

/**
 * Script to fetch SERP API data for existing hotels and update their details
 * This script:
 * 1. Fetches all hotels from the database
 * 2. For each hotel, calls SERP API to get updated details
 * 3. Properly serializes all Date objects before storing
 * 4. Updates the hotel records
 */

import dotenv from 'dotenv';
import path from 'path';

// Try multiple possible paths for .env file
const possibleEnvPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.join(process.cwd(), '.env'),
];

let envResult: dotenv.DotenvConfigOutput | null = null;
let loadedPath: string | null = null;

// Try to load .env from different possible locations
for (const envPath of possibleEnvPaths) {
  envResult = dotenv.config({ path: envPath });
  if (!envResult.error) {
    loadedPath = envPath;
    console.log(`✓ Loaded environment variables from ${envPath}`);
    break;
  }
}

// If all paths failed, try loading without path (default behavior)
if (envResult?.error) {
  envResult = dotenv.config();
  if (!envResult.error) {
    loadedPath = 'default location';
    console.log(`✓ Loaded environment variables from default location`);
  } else {
    console.warn(`⚠ Warning: Could not load .env file from any of these paths:`);
    possibleEnvPaths.forEach(p => console.warn(`  - ${p}`));
    console.warn(`  - default location`);
  }
}

// Debug: Show if SERP_API_KEY is loaded
console.log(`SERP_API_KEY is ${process.env.SERP_API_KEY ? 'SET' : 'NOT SET'}`);
if (process.env.SERP_API_KEY) {
  console.log(`SERP_API_KEY length: ${process.env.SERP_API_KEY.length} characters`);
}

// Verify SERP_API_KEY is loaded
if (!process.env.SERP_API_KEY) {
  console.error('\n❌ ERROR: SERP_API_KEY is not set in environment variables.');
  console.error('Please ensure:');
  console.error('  1. You have a .env file in the project root');
  console.error('  2. The .env file contains: SERP_API_KEY=your_key_here');
  console.error('  3. There are no spaces around the = sign');
  console.error(`\nCurrent working directory: ${process.cwd()}`);
  console.error(`Tried loading from: ${possibleEnvPaths.join(', ')}`);
  process.exit(1);
}

import { connectDB, getPool } from '../services/auth-service/src/config/database';
import { connectDB as connectSerpApiDB, getPool as getSerpApiPool } from '../services/serpapi-service/src/config/database';
import { fetchHotelRates, searchHotelWithLocation } from '../services/serpapi-service/src/collectors/serpapi-collector';
import { transformSerpApiResponse } from '../services/serpapi-service/src/transformers/serpapi-transformer';
import { formatHotelQuery, formatDate } from '../services/serpapi-service/src/utils/formatters';
import { HotelRepository } from '../services/auth-service/src/repositories/hotel-repository';

interface Hotel {
  hotel_id: string;
  hotel_name: string;
  gps_lat: number | null;
  gps_lon: number | null;
  city: string | null;
  amenities_json: any | null;
}

/**
 * Recursively serialize Date objects to ISO strings for JSONB storage
 */
function serializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDates(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

async function updateHotelDetails() {
  try {
    // Initialize database connections
    console.log('Initializing database connections...');
    await connectDB();
    await connectSerpApiDB();
    console.log('Database connections established.\n');

    const pool = getPool();
    const hotelRepository = new HotelRepository();

    console.log('Starting hotel details update...\n');

    // Fetch all hotels from database, including amenities_json to check if they have SERP API data
    const hotelsQuery = `
      SELECT 
        hotel_id,
        hotel_name,
        gps_lat,
        gps_lon,
        city,
        amenities_json
      FROM hotels
      WHERE hotel_name IS NOT NULL
      ORDER BY hotel_name
    `;

    const result = await pool.query(hotelsQuery);
    const hotels: Hotel[] = result.rows;

    if (hotels.length === 0) {
      console.log('No hotels found in database.');
      return;
    }

    console.log(`Found ${hotels.length} hotels to update.\n`);

    // Use default dates (today + 7 days)
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 1);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 7);

    const formattedCheckIn = formatDate(checkInDate.toISOString().split('T')[0]);
    const formattedCheckOut = formatDate(checkOutDate.toISOString().split('T')[0]);

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < hotels.length; i++) {
      const hotel = hotels[i];
      console.log(`[${i + 1}/${hotels.length}] Processing: ${hotel.hotel_name}`);

      // Check if hotel already has SERP API data
      if (hotel.amenities_json && typeof hotel.amenities_json === 'object' && Object.keys(hotel.amenities_json).length > 0) {
        console.log(`  ⏭ Skipped: Hotel already has SERP API data`);
        skippedCount++;
        continue;
      }

      try {
        // Format hotel query
        const hotelQuery = formatHotelQuery(hotel.hotel_name);

        // Fetch rates from SerpAPI
        const ratesData = await fetchHotelRates({
          hotelQuery,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
          adults: 2,
        });

        // Transform SerpAPI response
        const transformedData = transformSerpApiResponse(ratesData, {
          hotelQuery,
          checkInDate: formattedCheckIn,
          checkOutDate: formattedCheckOut,
          gl: 'us',
          hl: 'en',
          currency: 'USD',
          adults: 2,
        });

        // Ensure all Date objects are serialized
        const serializedData = serializeDates(transformedData);

        // Update hotel record if we have valid data
        if (serializedData.name && hotel.hotel_id) {
          await hotelRepository.create({
            name: serializedData.name || hotel.hotel_name,
            serpApiData: serializedData,
            existingHotelId: hotel.hotel_id,
          });
          console.log(`  ✓ Updated: ${serializedData.name}`);
          successCount++;
        } else {
          console.log(`  ⚠ Skipped: No valid data returned from SERP API`);
          failureCount++;
        }

        // Rate limit protection - wait 1 second between requests
        if (i < hotels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ✗ Failed: ${errorMessage}`);
        failureCount++;
        
        // Continue with next hotel even if this one fails
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total hotels: ${hotels.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Skipped (already have data): ${skippedCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log('\nDone!');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\nFatal error: ${errorMessage}`);
    process.exit(1);
  } finally {
    // Close database connections
    try {
      try {
        const pool = getPool();
        await pool.end();
      } catch (e) {
        // Pool might not be initialized
      }
      try {
        const serpApiPool = getSerpApiPool();
        await serpApiPool.end();
      } catch (e) {
        // Pool might not be initialized
      }
      console.log('\nDatabase connections closed.');
    } catch (closeError) {
      // Ignore errors when closing connections
      console.error('Error closing database connections:', closeError);
    }
  }
}

// Run the script
if (require.main === module) {
  updateHotelDetails().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { updateHotelDetails };

