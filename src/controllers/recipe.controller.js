// src/controllers/recipe.controller.js
const geminiService = require('../services/gemini.service');
const spoonacularService = require('../services/spoonacular.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/recipes/identify
// Takes an uploaded image, returns an array of detected ingredient names.
const identifyIngredients = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No image files uploaded');
  }

  const images = req.files.map(f => ({ buffer: f.buffer, mimeType: f.mimetype }));
  const ingredients = await geminiService.identifyIngredients(images);

  res.status(200).json({
    success: true,
    data: { ingredients },
  });
});

// POST /api/recipes/search
// Takes a list of ingredients, returns matching recipes.
const searchRecipes = asyncHandler(async (req, res) => {
  const { ingredients } = req.body;
  const recipes = await spoonacularService.findByIngredients(ingredients);
  res.status(200).json({
    success: true,
    data: { recipes },
  });
});

// GET /api/recipes/:id
// Returns full recipe details including instructions and nutrition.
const getRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipe = await spoonacularService.getRecipeInformation(id);
  res.status(200).json({
    success: true,
    data: { recipe },
  });
});

module.exports = { identifyIngredients, searchRecipes, getRecipe };
