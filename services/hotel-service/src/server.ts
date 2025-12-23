import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory only
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import hotelRoutes from './routes/v1/hotel-routes';

const app = express();
const PORT = process.env.HOTEL_SERVICE_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API versioning - v1 routes
app.use('/v1/hotel', hotelRoutes);

// Legacy routes (for backward compatibility during migration)
app.use('/v1/serpapi', hotelRoutes);
app.use('/serpapi', hotelRoutes);
app.use('/api/calendarData', hotelRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hotel-service',
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Hotel service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

