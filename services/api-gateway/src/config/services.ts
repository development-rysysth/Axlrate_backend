// Service URLs configuration
export const SERVICE_URLS = {
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  HOTEL_SERVICE: process.env.HOTEL_SERVICE_URL || process.env.SERPAPI_SERVICE_URL || 'http://localhost:3003',
  INGEST_SERVICE: process.env.INGEST_SERVICE_URL || 'http://localhost:3004',
  EXPORT_SERVICE: process.env.EXPORT_SERVICE_URL || 'http://localhost:3006',
  // Legacy alias for backward compatibility
  SERPAPI_SERVICE: process.env.HOTEL_SERVICE_URL || process.env.SERPAPI_SERVICE_URL || 'http://localhost:3003',
};

