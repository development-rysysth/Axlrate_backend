// Quick script to drop the unique index on property_token
// Run with: node --loader ts-node/esm drop_index.mjs

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function dropIndex() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.collection('serpdatas');

        // List all indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', JSON.stringify(indexes, null, 2));

        // Try to drop the property_token unique index
        try {
            await collection.dropIndex('property_token_1');
            console.log('✓ Dropped unique index: property_token_1');
        } catch (err) {
            console.log('Index property_token_1 not found or already dropped');
        }

        await mongoose.disconnect();
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

dropIndex();
