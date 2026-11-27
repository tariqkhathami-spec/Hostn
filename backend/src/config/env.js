/**
 * Environment variable validation — imported at server startup.
 * Fails fast with clear error messages if critical vars are missing.
 */

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const warnInProduction = [
  'MOYASAR_SECRET_KEY',
  'MOYASAR_PUBLISHABLE_KEY',
  'MOYASAR_WEBHOOK_SECRET',
];

const warnCloudinary = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const warnOtp = [
  'AUTHENTICA_API_KEY',
];

const warnBnpl = [
  'TABBY_SECRET_KEY',
  'TABBY_PUBLIC_KEY',
  'TAMARA_TOKEN',
];

const optionalWithWarning = [
  { key: 'CLIENT_URL', description: 'CORS origin for web frontend' },
  { key: 'REDIS_URL', description: 'Redis connection (rate limiting, caching)' },
  { key: 'GOOGLE_MAPS_SERVER_KEY', description: 'Geocoding and maps (Phase 27+)' },
  { key: 'TAMARA_NOTIFICATION_TOKEN', description: 'Tamara webhook verification token' },
];

function validateEnv() {
  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('=== FATAL: Missing required environment variables ===');
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error('Server cannot start without these. Exiting.');
    process.exit(1);
  }

  // Warn about missing payment vars (non-fatal — payments won't work but app starts)
  if (process.env.NODE_ENV === 'production') {
    const missingPayment = warnInProduction.filter(
      (key) => !process.env[key] || process.env[key].trim() === ''
    );
    if (missingPayment.length > 0) {
      console.warn('=== WARNING: Missing payment environment variables ===');
      missingPayment.forEach((key) => console.warn(`  - ${key}`));
      console.warn('Payment processing will be disabled until these are set.');
    }

    const missingOtp = warnOtp.filter(
      (key) => !process.env[key] || process.env[key].trim() === ''
    );
    if (missingOtp.length > 0) {
      console.warn('=== WARNING: Missing OTP provider environment variables ===');
      missingOtp.forEach((key) => console.warn(`  - ${key}`));
      console.warn('OTP via Authentica will not work until these are set.');
    }

    const missingBnpl = warnBnpl.filter(
      (key) => !process.env[key] || process.env[key].trim() === ''
    );
    if (missingBnpl.length > 0) {
      console.warn('=== WARNING: Missing BNPL environment variables ===');
      missingBnpl.forEach((key) => console.warn(`  - ${key}`));
      console.warn('BNPL (Tabby/Tamara) will be disabled until these are set.');
    }

    // Uploads use S3 when AWS_ACCESS_KEY_ID + AWS_S3_BUCKET are set and fall
    // back to Cloudinary otherwise (routes/upload.js). Only warn when the
    // storage that will actually be used is missing its credentials.
    const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET);
    const missingCloudinary = warnCloudinary.filter(
      (key) => !process.env[key] || process.env[key].trim() === ''
    );
    if (!useS3 && missingCloudinary.length > 0) {
      console.warn('=== WARNING: No image storage configured ===');
      console.warn('S3 is not configured (AWS_ACCESS_KEY_ID / AWS_S3_BUCKET), and Cloudinary is missing:');
      missingCloudinary.forEach((key) => console.warn(`  - ${key}`));
      console.warn('Image uploads will fail until S3 or Cloudinary credentials are set.');
    }
  }

  // Warn about missing optional vars
  const missingOptional = optionalWithWarning.filter(
    ({ key }) => !process.env[key] || process.env[key].trim() === ''
  );
  if (missingOptional.length > 0) {
    console.warn('[CONFIG] Optional environment variables not set:');
    missingOptional.forEach(({ key, description }) =>
      console.warn(`  - ${key}: ${description}`)
    );
  }

  // Warn about weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. Use a strong secret in production.');
  }

  // Default NODE_ENV
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.warn('[CONFIG] NODE_ENV not set, defaulting to "development".');
  }
}

module.exports = validateEnv;
