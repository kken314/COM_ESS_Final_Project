// server.js
// Application entry point. Connects to MongoDB, then starts the HTTP server.
const app = require('./src/app');
const connectDatabase = require('./src/config/database');
const config = require('./src/config/env');

async function startServer() {
  await connectDatabase();

  const server = app.listen(config.PORT, () => {
    console.log(`✓ Server running at http://localhost:${config.PORT}`);
    console.log(`  Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown.
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down...`);
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
