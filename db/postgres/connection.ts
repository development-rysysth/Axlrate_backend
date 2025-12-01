import { Pool, PoolConfig } from 'pg';

let pools: Map<string, Pool> = new Map();

/**
 * Create or get a PostgreSQL connection pool
 * @param serviceName - Name of the service (used as pool identifier)
 * @returns Pool instance
 */
export const createPostgresPool = (serviceName: string): Pool => {
  // Return existing pool if it exists
  if (pools.has(serviceName)) {
    const existingPool = pools.get(serviceName);
    if (existingPool && !existingPool.ended) {
      return existingPool;
    }
  }

  // Get environment variables with proper defaults
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.POSTGRES_DB || 'axlrate';
  const user = process.env.POSTGRES_USER || 'axlrate_user';
  const password = process.env.POSTGRES_PASSWORD || '';
  
  // If connecting through PgBouncer with pool_mode: session,
  // the connection string format should be used
  // Note: pool_mode is a PgBouncer server setting, not a client setting
  const useConnectionString = process.env.POSTGRES_USE_CONNECTION_STRING === 'true';
  
  const config: PoolConfig = useConnectionString
    ? {
        connectionString: `postgresql://${user}${password ? `:${password}` : ''}@${host}:${port}/${database}`,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        // For session mode pooling (when using PgBouncer)
        // Each client connection gets its own server connection
        allowExitOnIdle: false,
      }
    : {
        host,
        port,
        database,
        user,
        password: password || undefined, // Use undefined instead of empty string if no password
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        allowExitOnIdle: false,
      };

  const pool = new Pool(config);

  pool.on('connect', (client) => {
    console.log(`[${serviceName}] PostgreSQL pool connected to ${host}:${port}/${database}`);
  });

  pool.on('error', (err) => {
    console.error(`[${serviceName}] PostgreSQL pool error:`, err);
  });

  // Test connection on pool creation
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error(`[${serviceName}] PostgreSQL connection test failed:`, err.message);
      console.error(`[${serviceName}] Connection details: ${host}:${port}/${database} as ${user}`);
    } else {
      console.log(`[${serviceName}] PostgreSQL connection test successful`);
    }
  });

  pools.set(serviceName, pool);
  console.log(`[${serviceName}] PostgreSQL pool created`);

  return pool;
};

/**
 * Close a PostgreSQL connection pool
 * @param serviceName - Name of the service
 * @returns Promise<void>
 */
export const closePostgresPool = async (serviceName: string): Promise<void> => {
  const pool = pools.get(serviceName);
  if (pool) {
    await pool.end();
    pools.delete(serviceName);
    console.log(`[${serviceName}] PostgreSQL pool closed`);
  }
};

/**
 * Close all PostgreSQL connection pools
 * @returns Promise<void>
 */
export const closeAllPostgresPools = async (): Promise<void> => {
  const closePromises = Array.from(pools.entries()).map(async ([serviceName, pool]) => {
    await pool.end();
    console.log(`[${serviceName}] PostgreSQL pool closed`);
  });
  await Promise.all(closePromises);
  pools.clear();
};

