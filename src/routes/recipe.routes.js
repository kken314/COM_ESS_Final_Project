// src/routes/recipe.routes.js
const express = require('express');
const recipeController = require('../controllers/recipe.controller');
const authenticate = require('../middlewares/auth.middleware');
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

// POST /api/recipes/identify  (multipart/form-data, field: "image")
router.post('/identify', upload, recipeController.identifyIngredients);

// POST /api/recipes/search    (JSON body: { ingredients: [...] })
router.post('/search', validate(searchSchema), recipeController.searchRecipes);

// GET /api/recipes/favorites  (must be before /:id to avoid id clash)
router.get('/favorites', recipeController.getFavorites);

// POST /api/recipes/:id/favorite  (toggle save/unsave)
router.post(
  '/:id/favorite',
  validate(recipeIdSchema, 'params'),
  validate(favoriteBodySchema),
  recipeController.toggleFavorite
);

// GET /api/recipes/:id
router.get(
  '/:id',
  validate(recipeIdSchema, 'params'),
  recipeController.getRecipe
);

module.exports = router;
