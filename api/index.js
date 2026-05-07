const mongoose = require('mongoose');
const app = require('../src/app');
const connectDatabase = require('../src/config/database');

module.exports = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDatabase();
  }
  app(req, res);
};
