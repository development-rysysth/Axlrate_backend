// Service URLs configuration
export const SERVICE_URLS = {
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  SERPAPI_SERVICE: process.env.SERPAPI_SERVICE_URL || 'http://localhost:3003',
  INGEST_SERVICE: process.env.INGEST_SERVICE_URL || 'http://localhost:3004',
  AGGREGATOR_SERVICE: process.env.AGGREGATOR_SERVICE_URL || 'http://localhost:3005',
  EXPORT_SERVICE: process.env.EXPORT_SERVICE_URL || 'http://localhost:3006',
};

