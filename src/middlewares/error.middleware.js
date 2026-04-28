// src/middlewares/error.middleware.js
// Catches all errors thrown anywhere in the request lifecycle and formats
// them as a clean JSON response.
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Multer-specific errors (file too large, etc.)
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Image must be smaller than 15MB';
    }
  }

  // Mongoose duplicate key error (just in case it slips past our service check).
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  // Mongoose validation error.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Log unexpected (non-operational) errors.
  if (!err.isOperational) {
    console.error('Unexpected error:', err);
  }

  const body = { success: false, message };
  if (config.NODE_ENV === 'development' && !err.isOperational) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

// 404 handler — used for any route that doesn't match.
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = { errorHandler, notFound };
