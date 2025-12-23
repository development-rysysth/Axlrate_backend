import { createPostgresPool } from '../../../../db/postgres/connection';
import { Pool } from 'pg';

let postgresPool: Pool | null = null;

export const connectDB = async (): Promise<void> => {
  // Connect to PostgreSQL (for hotels and rates data)
  postgresPool = createPostgresPool('hotel-service');
};

export const getPool = (): Pool => {
  if (!postgresPool) {
    throw new Error('PostgreSQL pool not initialized. Call connectDB() first.');
  }
  return postgresPool;
};

