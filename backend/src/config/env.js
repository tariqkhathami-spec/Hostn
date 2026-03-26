/**
 * Environment variable validation — imported at server startup.
 * Fails fast with clear error messages if critical vars are missing.
 */

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const requiredInProduction = [
  'MOYASAR_SECRET_KEY',
  'MOYASAR_PUBLISHABLE_KEY',
  'MOYASAR_WEBHOOK_SECRET',
];

function validateEnv() {
  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of requiredInProduction) {
      if (!process.env[key] || process.env[key].trim() === '') {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    console.error('=== FATAL: Missing required environment variables ===');
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error('Server cannot start without these. Exiting.');
    process.exit(1);
  }

  // Warn about weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. Use a strong secret in production.');
  }

  // Warn about missing optional but recommended vars
  if (!process.env.MOYASAR_SECRET_KEY) {
    console.warn('[WARNING] MOYASAR_SECRET_KEY not set. Payment verification with Moyasar API is disabled.');
    console.warn('[WARNING] In production, this MUST be set to prevent payment fraud.');
  }

  if (!process.env.MOYASAR_WEBHOOK_SECRET) {
    console.warn('[WARNING] MOYASAR_WEBHOOK_SECRET not set. All webhooks will be rejected.');
  }
}

module.exports = validateEnv;
