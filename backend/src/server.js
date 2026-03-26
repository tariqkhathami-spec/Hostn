require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

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

// Connect to database
connectDB();

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
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

// ── Rate limiting ─────────────────────────────────────────────────────────────
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hostn API is running', timestamp: new Date() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/auth', otpRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/coupons', couponRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Hostn API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
