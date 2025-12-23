import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

import { connectDB } from '../config/database';
import { HotelIngestionService } from '../services/hotel-ingestion-service';

/**
 * Script to run hotel ingestion for a specific city
 * Usage: npm run ingest:city <cityName>
 * Example: npm run ingest:city Waupaca
 */
async function main() {
  try {
    // Get city name from command line arguments
    const cityName = process.argv[2];

    if (!cityName) {
      console.error('[hotel-ingestion-service] Error: City name is required');
      console.error('[hotel-ingestion-service] Usage: npm run ingest:city <cityName>');
      console.error('[hotel-ingestion-service] Example: npm run ingest:city Waupaca');
      process.exit(1);
    }

    console.log(`[hotel-ingestion-service] Starting ingestion for city: ${cityName}`);

    // Initialize database connection
    await connectDB();

    // Create ingestion service
    const ingestionService = new HotelIngestionService();

    // Run ingestion for the specified city
    await ingestionService.ingestHotelsForCity(cityName);

    console.log(`[hotel-ingestion-service] Ingestion completed successfully for: ${cityName}`);
    
    // Graceful shutdown
    process.exit(0);
  } catch (error) {
    console.error(`[hotel-ingestion-service] Fatal error:`, error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[hotel-ingestion-service] Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[hotel-ingestion-service] Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[hotel-ingestion-service] Unhandled Rejection at:`, promise, `reason:`, reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(`[hotel-ingestion-service] Uncaught Exception:`, error);
  process.exit(1);
});

// Run the ingestion script
main();

