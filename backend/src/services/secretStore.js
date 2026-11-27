/**
 * Encrypted store for integration keys managed from the admin dashboard.
 *
 * How the rest of the app sees the values: through process.env, exactly as
 * before. On boot (src/index.js) and whenever a key changes, the saved values
 * are written into process.env, so code that reads process.env.X at call time
 * picks the change up at once, and code that reads it at require time picks it
 * up on the next start. No caller needs to know where a value came from.
 *
 * Precedence: a value saved in the dashboard wins; clearing it restores the
 * original environment variable (snapshotted at boot).
 *
 * Encryption: AES-256-GCM, a fresh 12-byte IV per value, key derived from
 * SECRETS_MASTER_KEY with SHA-256. The key name is bound as additional
 * authenticated data, so a ciphertext copied onto another key fails to decrypt.
 * Without SECRETS_MASTER_KEY the store is off: nothing is read or written and
 * the app runs on its environment variables alone.
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');
const { KEYS, getDefinition } = require('../config/integrationKeys');

const events = new EventEmitter();

// Environment as it was before any dashboard value was applied.
const originalEnv = {};
for (const { key } of KEYS) originalEnv[key] = process.env[key];

// key -> { value, updatedAt, updatedByName } for values saved in the dashboard
let saved = new Map();
let loadedAt = null;
let lastError = null;
// Keys whose effective value changed since this process started; for a key
// read only at start-up that means a restart is still needed.
const changedSinceBoot = new Set();

function masterKey() {
  const raw = process.env.SECRETS_MASTER_KEY;
  if (!raw || raw.length < 32) return null;
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

function isEnabled() {
  return masterKey() !== null;
}

function encrypt(key, plaintext) {
  const mk = masterKey();
  if (!mk) throw new Error('SECRETS_MASTER_KEY is not set');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', mk, iv);
  cipher.setAAD(Buffer.from(key, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decrypt(key, { iv, ciphertext, tag }) {
  const mk = masterKey();
  if (!mk) throw new Error('SECRETS_MASTER_KEY is not set');
  const decipher = crypto.createDecipheriv('aes-256-gcm', mk, Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(key, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/** Write the effective value of every registry key into process.env. */
function applyToEnv() {
  for (const { key } of KEYS) {
    const before = process.env[key];
    const entry = saved.get(key);
    const next = entry ? entry.value : originalEnv[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
    if (before !== process.env[key]) {
      if (loadedAt) changedSinceBoot.add(key);
      events.emit('change', key);
    }
  }
}

/**
 * Read all saved values from MongoDB and apply them.
 * @param {import('mongoose').Model} [Model] - IntegrationSetting on a given
 *   connection (the boot preload uses its own short-lived connection).
 */
async function load(Model) {
  if (!isEnabled()) {
    saved = new Map();
    return { enabled: false, count: 0 };
  }
  const M = Model || require('../models/IntegrationSetting');
  const docs = await M.find({}).lean();
  const next = new Map();
  for (const doc of docs) {
    if (!getDefinition(doc.key)) continue; // removed from the registry, or bootstrap-only
    try {
      next.set(doc.key, { value: decrypt(doc.key, doc), updatedAt: doc.updatedAt, updatedByName: doc.updatedByName });
    } catch (err) {
      // Wrong master key or tampered row: ignore it, keep the env fallback.
      lastError = `Could not decrypt ${doc.key}`;
      console.error(`[SECRETS] Could not decrypt ${doc.key} — check SECRETS_MASTER_KEY. Using the environment value.`);
    }
  }
  saved = next;
  applyToEnv();
  loadedAt = loadedAt || new Date();
  return { enabled: true, count: saved.size };
}

async function set(key, value, admin) {
  const def = getDefinition(key);
  if (!def) throw Object.assign(new Error('Unknown key'), { status: 400 });
  if (!isEnabled()) throw Object.assign(new Error('SECRETS_MASTER_KEY is not set'), { status: 409 });
  const Model = require('../models/IntegrationSetting');
  const enc = encrypt(key, value);
  const doc = await Model.findOneAndUpdate(
    { key },
    { $set: { ...enc, updatedBy: admin?._id || null, updatedByName: admin?.name || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  saved.set(key, { value, updatedAt: doc.updatedAt, updatedByName: doc.updatedByName });
  applyToEnv();
}

async function clear(key) {
  const def = getDefinition(key);
  if (!def) throw Object.assign(new Error('Unknown key'), { status: 400 });
  const Model = require('../models/IntegrationSetting');
  await Model.deleteOne({ key });
  saved.delete(key);
  applyToEnv();
}

/** Last 4 characters at most, and only when the value is long enough to hide the rest. */
function mask(value) {
  if (!value) return null;
  if (value.length < 12) return '••••';
  return `••••${value.slice(-4)}`;
}

/** What the admin page may see: never a secret value. */
function describe() {
  return KEYS.map((def) => {
    const entry = saved.get(def.key);
    const envValue = originalEnv[def.key];
    const source = entry ? 'dashboard' : envValue ? 'env' : 'none';
    const effective = entry ? entry.value : envValue;
    return {
      key: def.key,
      group: def.group,
      secret: def.secret,
      live: def.live,
      type: def.type || 'text',
      options: def.options,
      label: { ar: def.ar, en: def.en },
      hint: def.hint || null,
      source,
      value: def.secret ? null : effective ?? null,
      masked: def.secret ? mask(effective) : null,
      updatedAt: entry?.updatedAt || null,
      updatedByName: entry?.updatedByName || null,
      restartNeeded: !def.live && changedSinceBoot.has(def.key),
    };
  });
}

function status() {
  return { enabled: isEnabled(), loadedAt, lastError };
}

/** Pick up changes made by another server instance. */
function startRefresh(intervalMs = 60 * 1000) {
  if (!isEnabled()) return null;
  const timer = setInterval(() => {
    load().catch((err) => console.error('[SECRETS] Refresh failed:', err.message));
  }, intervalMs);
  timer.unref();
  return timer;
}

module.exports = {
  load, set, clear, describe, status, startRefresh, isEnabled, events,
  // exported for tests
  _encrypt: encrypt, _decrypt: decrypt, _mask: mask,
};
