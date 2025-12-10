import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory only
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import serpapiRoutes from './routes/v1/serpapi-routes';

const app = express();
const PORT = process.env.SERPAPI_SERVICE_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API versioning - v1 routes
app.use('/v1/serpapi', serpapiRoutes);

// Legacy routes (for backward compatibility during migration)
app.use('/serpapi', serpapiRoutes);
app.use('/api/calendarData', serpapiRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'serpapi-service',
    hasApiKey: !!process.env.SERP_API_KEY,
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

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

