import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        reconnectStrategy: false, // Disable auto-reconnect to prevent error spam
      },
    });

    // Only set up error handler after successful connection
    redisClient.on('error', (err) => {
      if (isRedisConnected) {
        console.error('[aggregator-service] Redis Client Error:', err.message);
      }
    });
    
    await redisClient.connect();
    isRedisConnected = true;
    console.log('[aggregator-service] Redis connected');
  } catch (error) {
    // Clean up failed client
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch {
        // Ignore quit errors
      }
      redisClient = null;
    }
    isRedisConnected = false;
    throw error; // Re-throw to let caller handle gracefully
  }
};

export const getRedisClient = (): ReturnType<typeof createClient> => {
  if (!redisClient || !isRedisConnected) {
    throw new Error('Redis client not initialized or not connected. Call connectRedis() first.');
  }
  return redisClient;
};

export const isRedisAvailable = () => {
  return isRedisConnected && redisClient !== null;
};

