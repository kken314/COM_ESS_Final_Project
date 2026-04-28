// src/utils/ApiError.js
// Custom error class so controllers/services can throw structured errors
// that the global error handler knows how to format.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Marks this as an expected error, not a bug.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
