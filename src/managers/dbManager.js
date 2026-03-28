const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongoDB = async () => {
    if (!process.env.MONGO_URI) {
        console.log('\x1b[33m[⚠️ DATABASE]\x1b[0m MongoDB URI not found in .env file. Skipping connection.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`\x1b[32m[🍃 DATABASE]\x1b[0m Successfully connected to MongoDB.`);
    } catch (error) {
        console.error(`\x1b[31m[❌ DATABASE]\x1b[0m Error connecting to MongoDB:`, error);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('\x1b[33m[⚠️ DATABASE]\x1b[0m Disconnected from MongoDB.');
});

module.exports = { connectToMongoDB };