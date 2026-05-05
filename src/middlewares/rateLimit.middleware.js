// src/middlewares/rateLimit.middleware.js
// Per-user token bucket stored in MongoDB.
// Usage: rateLimit(20) — returns middleware that allows `limit` requests per minute.
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const rateLimit = (limit, bucket) => asyncHandler(async (req, res, next) => {
  const now = new Date();
  const user = await User.findById(req.user.id);
  const slot = user.rateLimit[bucket];

  if (slot.resetAt <= now) {
    slot.count = 1;
    slot.resetAt = new Date(now.getTime() + 60_000);
  } else if (slot.count >= limit) {
    const waitSec = Math.ceil((slot.resetAt - now) / 1000);
    throw new ApiError(429, `Rate limit reached. Try again in ${waitSec}s.`);
  } else {
    slot.count += 1;
  }

  await user.save();
  req.rateLimit = { limit, remaining: limit - slot.count };
  next();
});

module.exports = rateLimit;
