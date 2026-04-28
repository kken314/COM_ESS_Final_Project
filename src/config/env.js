// src/config/env.js
// Loads environment variables and validates that required ones exist.
require('dotenv').config();

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'SPOONACULAR_API_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  SPOONACULAR_API_KEY: process.env.SPOONACULAR_API_KEY,
};
