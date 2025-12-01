import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 * @param serviceName - Name of the service connecting (for logging)
 * @returns Promise<void>
 */
export const connectMongoDB = async (serviceName: string): Promise<void> => {
  try {
    // Use environment variable or default to local MongoDB for development
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/axlrate';
    
    if (!process.env.MONGODB_URI) {
      console.warn(
        `[${serviceName}] MONGODB_URI not set, using default: mongodb://localhost:27017/axlrate\n` +
        'To set a custom MongoDB URI, create a .env file in the root directory with:\n' +
        'MONGODB_URI=mongodb://localhost:27017/axlrate\n' +
        'Or copy config/env.example to .env'
      );
    }

    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[${serviceName}] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[${serviceName}] MongoDB connection error:`, error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * @param serviceName - Name of the service disconnecting (for logging)
 * @returns Promise<void>
 */
export const disconnectMongoDB = async (serviceName: string): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log(`[${serviceName}] MongoDB Disconnected`);
  } catch (error) {
    console.error(`[${serviceName}] MongoDB disconnection error:`, error);
  }
};

