require('dotenv').config();
const validateEnv = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');

// Route imports
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const hostRoutes = require('./routes/host');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messageRoutes');
const supportRoutes = require('./routes/supportRoutes');
const reportRoutes = require('./routes/reportRoutes');
const otpRoutes = require('./routes/otpRoutes');
const walletRoutes = require('./routes/wallet');
const paymentMethodRoutes = require('./routes/paymentMethods');
const couponRoutes = require('./routes/coupons');

// ── Initialize infrastructure ────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();
  await connectRedis();
}
bootstrap();

const app = express();

// ── Trust proxy (required behind load balancers for correct IP detection) ────
app.set('trust proxy', 1);

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin images
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── CORS (whitelist-based, allows mobile apps with no origin) ─────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : [process.env.CLIENT_URL || 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    maxAge: 3600,
  })
);

// Cookie parser (required for HttpOnly cookie auth on web)
app.use(cookieParser());

// ── Body parsing with size limits ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── NoSQL injection protection ───────────────────────────────────────────────
app.use(mongoSanitize({ replaceWith: '_' }));

// ── Rate limiting (in-memory — will be replaced with Redis in Phase 6) ───────
const rateLimitStore = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = {}) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now - entry.start > windowMs) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.start > windowMs) {
      rateLimitStore.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, try again in 15 minutes' });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many accounts created, try again later' });
const messageLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many messages sent, please slow down' });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Health check routes (no rate limiting, no auth) ──────────────────────────
app.use('/health', healthRoutes);

// ── Routes (versioned: /api/v1/) ──────────────────────────────────────────────
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', registerLimiter);
app.use('/api/v1', apiLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', otpRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/host', hostRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/messages', messageLimiter, messageRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/coupons', couponRoutes);

// Backwards compatibility: /api/* redirects to /api/v1/*
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v1/')) return next('route');
  req.url = `/v1${req.url}`;
  app.handle(req, res, next);
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Hostn API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds

async function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');

    try {
      // Close MongoDB
      await mongoose.connection.close();
      console.log('[SHUTDOWN] MongoDB connection closed.');

      // Close Redis
      await disconnectRedis();
      console.log('[SHUTDOWN] Redis connection closed.');

      console.log('[SHUTDOWN] Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN] Error during cleanup:', err);
      process.exit(1);
    }
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Unhandled error handlers ─────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
