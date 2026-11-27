/**
 * Process entry point.
 *
 * Loads the integration keys saved from the admin dashboard into process.env
 * BEFORE the app is required, so modules that read a key once at require time
 * (payments, S3, email) see the saved value. Then starts the server as before.
 *
 * Any failure here is logged and skipped: the server always starts, falling
 * back to its environment variables.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const secretStore = require('./services/secretStore');

async function preloadIntegrationKeys() {
  if (!secretStore.isEnabled()) {
    console.log('[SECRETS] SECRETS_MASTER_KEY not set — dashboard-managed keys are off, using environment variables only.');
    return;
  }
  if (!process.env.MONGODB_URI) return; // server.js reports this and exits
  let conn;
  try {
    conn = await mongoose.createConnection(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 1,
    }).asPromise();
    const schema = require('./models/IntegrationSetting').schema;
    const Model = conn.model('IntegrationSetting', schema);
    const { count } = await secretStore.load(Model);
    console.log(`[SECRETS] Loaded ${count} dashboard-managed key(s).`);
  } catch (err) {
    console.error('[SECRETS] Could not load dashboard-managed keys, using environment variables:', err.message);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}

preloadIntegrationKeys().finally(() => {
  require('./server');
  secretStore.startRefresh();
});
