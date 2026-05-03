// src/middlewares/rateLimit.middleware.js
// Per-user token bucket stored in MongoDB.
// Usage: rateLimit(20) — returns middleware that allows `limit` requests per minute.
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const rateLimit = (limit) => asyncHandler(async (req, res, next) => {
  const now = new Date();
  const user = await User.findById(req.user.id);

  if (user.rateLimit.resetAt <= now) {
    user.rateLimit.count = 1;
    user.rateLimit.resetAt = new Date(now.getTime() + 60_000);
  } else if (user.rateLimit.count >= limit) {
    const waitSec = Math.ceil((user.rateLimit.resetAt - now) / 1000);
    throw new ApiError(429, `Rate limit reached. Try again in ${waitSec}s.`);
  } else {
    user.rateLimit.count += 1;
  }

  await user.save();
  req.rateLimit = { limit, remaining: limit - user.rateLimit.count };
  next();
});

module.exports = rateLimit;
