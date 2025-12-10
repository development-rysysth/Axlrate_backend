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

  // Debug: Log environment variables (without sensitive data)
  console.log(`[${serviceName}] Loading PostgreSQL config...`);
  console.log(`[${serviceName}] POSTGRES_HOST: ${process.env.POSTGRES_HOST || 'NOT SET'}`);
  console.log(`[${serviceName}] POSTGRES_DB: ${process.env.POSTGRES_DB || 'NOT SET'}`);
  console.log(`[${serviceName}] POSTGRES_USER: ${process.env.POSTGRES_USER ? 'SET' : 'NOT SET'}`);
  console.log(`[${serviceName}] POSTGRES_CONNECTION_STRING: ${process.env.POSTGRES_CONNECTION_STRING ? 'SET' : 'NOT SET'}`);

  // Check if a full connection string is provided (for Supabase, etc.)
  const connectionString = process.env.POSTGRES_CONNECTION_STRING;
  
  if (connectionString) {
    // Use provided connection string directly
    const config: PoolConfig = {
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      allowExitOnIdle: false,
    };
    
    const pool = new Pool(config);
    setupPoolHandlers(pool, serviceName, 'connection string');
    pools.set(serviceName, pool);
    console.log(`[${serviceName}] PostgreSQL pool created with connection string`);
    return pool;
  }

  // Get environment variables with proper defaults
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.POSTGRES_DB || 'postgres';
  const user = process.env.POSTGRES_USER || 'postgres';
  // Clean password: remove quotes and trim whitespace
  let password = (process.env.POSTGRES_PASSWORD || '').trim();
  // Remove surrounding quotes if present
  if ((password.startsWith('"') && password.endsWith('"')) || 
      (password.startsWith("'") && password.endsWith("'"))) {
    password = password.slice(1, -1);
  }
  
  // If connecting through PgBouncer/Supabase pooler with pool_mode: session,
  // the connection string format should be used
  // Note: pool_mode is a PgBouncer server setting, not a client setting
  const isSupabase = host.includes('supabase.com') || host.includes('supabase.co');
  const useConnectionString = process.env.POSTGRES_USE_CONNECTION_STRING === 'true' || 
                               process.env.POSTGRES_POOL_MODE === 'session' ||
                               host.includes('pooler.supabase.com') ||
                               host.includes('pooler') ||
                               isSupabase;
  
  // Validate required fields
  if (!database || !user) {
    throw new Error(`[${serviceName}] PostgreSQL configuration error: POSTGRES_DB and POSTGRES_USER must be set`);
  }
  
  // Validate password only for Supabase connections (local PostgreSQL may not require password)
  if (isSupabase && !password) {
    throw new Error(`[${serviceName}] PostgreSQL configuration error: POSTGRES_PASSWORD must be set for Supabase connection`);
  }
  
  // URL encode credentials for connection string (special characters like @ need encoding)
  const config: PoolConfig = useConnectionString
    ? {
        connectionString: `postgresql://${encodeURIComponent(user)}${password ? `:${encodeURIComponent(password)}` : ''}@${host}:${port}/${encodeURIComponent(database)}`,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        // For session mode pooling (when using PgBouncer/Supabase)
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
  setupPoolHandlers(pool, serviceName, `${host}:${port}/${database}`);
  pools.set(serviceName, pool);
  console.log(`[${serviceName}] PostgreSQL pool created`);

  return pool;
};

/**
 * Setup pool event handlers and connection test
 */
function setupPoolHandlers(pool: Pool, serviceName: string, connectionInfo: string) {
  pool.on('connect', (client) => {
    console.log(`[${serviceName}] PostgreSQL pool connected to ${connectionInfo}`);
  });

  pool.on('error', (err) => {
    console.error(`[${serviceName}] PostgreSQL pool error:`, err);
  });

  // Test connection on pool creation
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error(`[${serviceName}] PostgreSQL connection test failed:`, err.message);
      console.error(`[${serviceName}] Connection details: ${connectionInfo}`);
    } else {
      console.log(`[${serviceName}] PostgreSQL connection test successful`);
    }
  });
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

