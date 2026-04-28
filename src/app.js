// src/app.js
// Builds the Express application: middleware stack, routes, error handlers.
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const config = require('./config/env');

const app = express();

// ----- Global middleware -----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ----- Static frontend -----
// Anything in /public is served at the root URL.
// Visiting "/" sends index.html, "/login.html" sends login.html, etc.
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----- API routes -----
app.use('/api', apiRoutes);

// ----- Error handling (must come last) -----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
