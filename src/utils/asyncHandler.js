// src/utils/asyncHandler.js
// Wraps an async controller so that any thrown/rejected error is automatically
// passed to Express's error-handling middleware. Saves us from writing
// try/catch inside every controller.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
