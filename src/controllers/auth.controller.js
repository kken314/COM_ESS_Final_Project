// src/controllers/auth.controller.js
// Controllers handle HTTP — they read the request, call a service, and send the response.
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await authService.register({ username, email, password });
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});

module.exports = { register, login };
