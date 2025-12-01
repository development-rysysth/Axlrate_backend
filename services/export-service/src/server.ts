import dotenv from 'dotenv';
dotenv.config({ path: '../../../.env' });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';

const app = express();
const PORT = process.env.EXPORT_SERVICE_PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'export-service' });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Export service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

