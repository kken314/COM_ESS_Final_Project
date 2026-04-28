// src/middlewares/validate.middleware.js
// Generic middleware that validates a part of the request against a Joi schema.
// Usage: validate(schema, 'body') or validate(schema, 'params')
const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false, // Return all errors, not just the first.
    stripUnknown: true, // Remove fields not declared in the schema.
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return next(new ApiError(400, message));
  }

  req[source] = value; // Use the validated/cleaned value going forward.
  next();
};

module.exports = validate;
