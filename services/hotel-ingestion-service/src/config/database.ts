import { createPostgresPool } from '../../../../db/postgres/connection';
import { Pool } from 'pg';

let postgresPool: Pool | null = null;

export const connectDB = async (): Promise<void> => {
  postgresPool = createPostgresPool('hotel-ingestion-service');
};

export const getPool = (): Pool => {
  if (!postgresPool) {
    throw new Error('PostgreSQL pool not initialized. Call connectDB() first.');
  }
  return postgresPool;
};

