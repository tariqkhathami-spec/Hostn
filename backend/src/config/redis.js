/**
 * Redis client configuration.
 * Used for: rate limiting, token blacklist, session cache.
 *
 * Falls back gracefully if Redis is unavailable (logs warning, app continues).
 */

let redisClient = null;
let isConnected = false;

async function connectRedis() {
  // Skip if REDIS_URL is not configured
  if (!process.env.REDIS_URL) {
    console.warn('[REDIS] REDIS_URL not set. Running without Redis (in-memory fallback).');
    return null;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[REDIS] Max reconnect attempts reached. Giving up.');
            return new Error('Max reconnect attempts reached');
          }
          return Math.min(retries * 200, 5000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error(`[REDIS] Error: ${err.message}`);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[REDIS] Connected successfully.');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.warn('[REDIS] Reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error(`[REDIS] Failed to connect: ${error.message}`);
    console.warn('[REDIS] Continuing without Redis.');
    redisClient = null;
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

function isRedisConnected() {
  return isConnected && redisClient !== null;
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

module.exports = { connectRedis, getRedisClient, isRedisConnected, disconnectRedis };
