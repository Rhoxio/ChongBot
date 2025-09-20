const express = require('express');

/**
 * Express server for health checks and Railway compatibility
 */

/**
 * Creates and starts the health check server
 * @param {Client} client - Discord client instance for status checks
 * @returns {Express} The Express app instance
 */
function createHealthServer(client) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Basic health endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      bot: client.user ? client.user.tag : 'Not logged in',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Detailed health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: client.isReady() ? 'healthy' : 'unhealthy',
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      uptime: process.uptime()
    });
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
  });

  return app;
}

module.exports = {
  createHealthServer
};
