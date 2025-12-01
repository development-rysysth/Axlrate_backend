import { connectMongoDB } from '../../../../db/mongodb/connection';

export const connectDB = async (): Promise<void> => {
  await connectMongoDB('auth-service');
};

