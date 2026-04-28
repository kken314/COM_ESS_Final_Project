// src/routes/index.js
// Combines all sub-routers into a single /api router.
const express = require('express');
const authRoutes = require('./auth.routes');
const recipeRoutes = require('./recipe.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/recipes', recipeRoutes);

module.exports = router;
