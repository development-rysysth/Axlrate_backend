import dotenv from 'dotenv';
dotenv.config({ path: '../../../.env' });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';

const app = express();
const PORT = process.env.AGGREGATOR_SERVICE_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

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

