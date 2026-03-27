const express = require('express');
const mongoose = require('mongoose');
const { isRedisConnected } = require('../config/redis');
const router = express.Router();

// @desc    Liveness probe — is the process running and bootstrapped?
// @route   GET /health/live
router.get('/live', (req, res) => {
  // Lazy-require to avoid circular dependency (server.js exports isBootstrapped)
  const { isBootstrapped } = require('../server');
  if (!isBootstrapped()) {
    return res.status(503).json({ status: 'starting', timestamp: new Date().toISOString() });
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// @desc    Readiness probe — are all dependencies ready?
// @route   GET /health/ready
router.get('/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1; // 1 = connected
  const redisReady = isRedisConnected();

  const isReady = mongoReady; // Redis is optional

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      mongodb: mongoReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'not_configured',
    },
    timestamp: new Date().toISOString(),
  });
});

// @desc    Full health check
// @route   GET /health
router.get('/', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = isRedisConnected();

  res.json({
    success: true,
    message: 'Hostn API is running',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    dependencies: {
      mongodb: mongoReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'not_configured',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
