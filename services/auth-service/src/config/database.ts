import { createPostgresPool } from '../../../../db/postgres/connection';

let pool: ReturnType<typeof createPostgresPool> | null = null;

export const connectDB = async (): Promise<void> => {
  pool = createPostgresPool('auth-service');
  console.log('[auth-service] PostgreSQL connected');
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB() first.');
  }
  return pool;
};

