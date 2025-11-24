import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || '');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

const dropIndex = async () => {
    await connectDB();
    try {
        const collection = mongoose.connection.collection('serpdatas');
        // List indexes first
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);

        // Drop the property_token index
        if (indexes.find(idx => idx.name === 'property_token_1')) {
            await collection.dropIndex('property_token_1');
            console.log('Dropped index: property_token_1');
        } else {
            console.log('Index property_token_1 not found.');
        }

    } catch (error) {
        console.error('Error dropping index:', error);
    } finally {
        await mongoose.disconnect();
    }
};

dropIndex();
