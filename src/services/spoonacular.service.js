// src/services/spoonacular.service.js
// Talks to the Spoonacular Recipe API.
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

const BASE_URL = 'https://api.spoonacular.com/recipes';

// Reusable axios instance — automatically attaches the API key to every request.
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  params: { apiKey: config.SPOONACULAR_API_KEY },
});

/**
 * Find recipes that can be made with the given ingredients.
 * @param {string[]} ingredients
 * @returns {Promise<Array>} Recipe summaries
 */
async function findByIngredients(ingredients) {
  try {
    const { data } = await client.get('/findByIngredients', {
      params: {
        ingredients: ingredients.join(','),
        number: 12, // Return up to 12 recipes.
        ranking: 2, // 2 = minimize missing ingredients (best for "what can I cook?")
        ignorePantry: true, // Ignore basics like salt, water, flour.
      },
    });
    return data;
  } catch (error) {
    console.error('Spoonacular findByIngredients error:', error.message);
    throw new ApiError(502, 'Failed to fetch recipes');
  }
}

/**
 * Get detailed recipe info, including instructions and nutrition.
 * @param {number|string} id - Recipe ID from Spoonacular
 */
async function getRecipeInformation(id) {
  try {
    const { data } = await client.get(`/${id}/information`, {
      params: { includeNutrition: true },
    });
    return data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new ApiError(404, 'Recipe not found');
    }
    console.error('Spoonacular getRecipeInformation error:', error.message);
    throw new ApiError(502, 'Failed to fetch recipe details');
  }
}

module.exports = { findByIngredients, getRecipeInformation };
