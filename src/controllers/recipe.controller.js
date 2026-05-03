// src/controllers/recipe.controller.js
const geminiService = require('../services/gemini.service');
const spoonacularService = require('../services/spoonacular.service');
const User = require('../models/User');
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
    data: { ingredients, rateLimit: req.rateLimit },
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

// GET /api/recipes/favorites
// Returns the current user's saved favorite recipes.
const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: { favorites: user.favorites },
  });
});

// POST /api/recipes/:id/favorite
// Toggles a recipe in/out of the user's favorites list.
const toggleFavorite = asyncHandler(async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  const { title, image } = req.body;

  const user = await User.findById(req.user.id);
  const existingIdx = user.favorites.findIndex((f) => f.id === recipeId);

  let isFavorited;
  if (existingIdx >= 0) {
    user.favorites.splice(existingIdx, 1);
    isFavorited = false;
  } else {
    user.favorites.push({ id: recipeId, title, image });
    isFavorited = true;
  }

  await user.save();
  res.status(200).json({
    success: true,
    data: { isFavorited, favorites: user.favorites },
  });
});

module.exports = { identifyIngredients, searchRecipes, getRecipe, getFavorites, toggleFavorite };
