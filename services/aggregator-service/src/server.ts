import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory only
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const result = dotenv.config({ path: rootEnvPath });

if (result.error) {
  console.error('[aggregator-service] Error loading .env:', result.error);
} else {
  console.log('[aggregator-service] Loading .env from:', rootEnvPath);
  console.log('[aggregator-service] .env loaded successfully');
  // Debug: Show loaded POSTGRES vars (without password)
  if (result.parsed) {
    console.log('[aggregator-service] POSTGRES_HOST:', result.parsed.POSTGRES_HOST || 'NOT FOUND');
    console.log('[aggregator-service] POSTGRES_DB:', result.parsed.POSTGRES_DB || 'NOT FOUND');
    console.log('[aggregator-service] POSTGRES_USER:', result.parsed.POSTGRES_USER ? 'SET' : 'NOT FOUND');
  }
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import v1Routes from './routes/v1/index';

const app = express();
const PORT = process.env.AGGREGATOR_SERVICE_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// API versioning - v1 routes
app.use('/v1', v1Routes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'aggregator-service' });
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to PostgreSQL (required)
    await connectDB();
    
    // Connect to Redis (optional - skip if not available)
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('[aggregator-service] Redis connection failed, continuing without Redis:', (redisError as Error).message);
    }
    
    app.listen(PORT, () => {
      console.log(`Aggregator service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

