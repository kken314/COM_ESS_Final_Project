// src/services/auth.service.js
// All authentication business logic lives here.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
  };
}

async function register({ username, email, password }) {
  // Check if email or username is already taken.
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new ApiError(409, `An account with this ${field} already exists`);
  }

  const user = await User.create({ username, email, password });
  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}

async function login({ email, password }) {
  // We need to explicitly select password since the schema hides it by default.
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}

module.exports = { register, login };
