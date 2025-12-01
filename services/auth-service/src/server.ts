import dotenv from 'dotenv';
import path from 'path';

// Try loading .env from root directory, fallback to config directory
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const configEnvPath = path.resolve(__dirname, '../../../config/.env');
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: configEnvPath }); // Fallback

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import authRoutes from './routes/v1/auth-routes';

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API versioning - v1 routes
app.use('/v1', authRoutes);

// Legacy routes (for backward compatibility during migration)
app.use('/auth', authRoutes);
app.use('/users', authRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', service: 'auth-service' });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

