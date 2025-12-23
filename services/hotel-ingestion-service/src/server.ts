import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

import { connectDB } from './config/database';

/**
 * Main entry point for hotel ingestion service
 * This service now runs as an idle server - ingestion must be triggered manually
 * Use: npm run ingest:city <cityName> to run ingestion
 */
async function main() {
  try {
    // Initialize database connection
    await connectDB();
    console.log('[hotel-ingestion-service] Database connected');
    console.log('[hotel-ingestion-service] Service is running (idle mode)');
    console.log('[hotel-ingestion-service] Use "npm run ingest:city <cityName>" to run ingestion');
    
    // Keep the process alive
    // The service is now idle and won't run ingestion automatically
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

// Start the service (idle mode)
main();

