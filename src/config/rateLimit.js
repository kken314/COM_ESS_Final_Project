// src/config/rateLimit.js
// Requests per minute per user for each route group.
module.exports = {
  IDENTIFY: 5,  // Gemini 1.5 Flash global cap is 15 RPM
  SEARCH:   20, // Spoonacular
  RECIPE:   20, // Spoonacular
};
