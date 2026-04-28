// src/validators/recipe.validator.js
const Joi = require('joi');

const searchSchema = Joi.object({
  ingredients: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .min(1)
    .max(30)
    .required()
    .messages({
      'array.min': 'Please provide at least one ingredient',
      'array.max': 'Too many ingredients (max 30)',
      'any.required': 'Ingredients are required',
    }),
});

const recipeIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = { searchSchema, recipeIdSchema };
