// src/config/database.js
// Handles connecting to MongoDB via Mongoose.
const mongoose = require('mongoose');
const config = require('./env');

async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
}

module.exports = connectDatabase;
