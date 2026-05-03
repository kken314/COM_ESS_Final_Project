// src/routes/recipe.routes.js
const express = require('express');
const recipeController = require('../controllers/recipe.controller');
const authenticate = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');
const rateLimitConfig = require('../config/rateLimit');
const upload = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  searchSchema,
  recipeIdSchema,
  favoriteBodySchema,
} = require('../validators/recipe.validator');

const router = express.Router();

// All recipe endpoints require authentication.
router.use(authenticate);

// POST /api/recipes/identify — 5 RPM per user (Gemini 1.5 Flash global limit is 15 RPM)
router.post('/identify', rateLimit(rateLimitConfig.IDENTIFY), upload, recipeController.identifyIngredients);

// POST /api/recipes/search
router.post('/search', rateLimit(rateLimitConfig.SEARCH), validate(searchSchema), recipeController.searchRecipes);

// GET /api/recipes/favorites  (MongoDB only — no rate limit needed)
router.get('/favorites', recipeController.getFavorites);

// POST /api/recipes/:id/favorite  (MongoDB only — no rate limit needed)
router.post(
  '/:id/favorite',
  validate(recipeIdSchema, 'params'),
  validate(favoriteBodySchema),
  recipeController.toggleFavorite
);

// GET /api/recipes/:id
router.get(
  '/:id',
  rateLimit(rateLimitConfig.RECIPE),
  validate(recipeIdSchema, 'params'),
  recipeController.getRecipe
);

module.exports = router;
