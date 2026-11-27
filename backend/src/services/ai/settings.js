/**
 * AI assistant settings: the ONE place that decides which model provider,
 * model and API key the assistant uses.
 *
 * Values are read from process.env on every call. The admin keys page
 * (services/secretStore.js) decrypts saved values into process.env at boot,
 * on every change and on a periodic refresh, so a key or model changed there
 * takes effect without a redeploy. `readStoredSettings()` stays as the hook
 * for any other store. Never log or return `apiKey` to a client.
 *
 *   AI_ENABLED          "false" turns the assistant off for everyone
 *   AI_ADMIN_ENABLED    "true"/"false" per audience; default: admin on, guest
 *   AI_GUEST_ENABLED    and host off, so customers only get it once an admin
 *   AI_HOST_ENABLED     has tried it and switched it on (keys page or env)
 *   AI_EXTRA_INSTRUCTIONS  admin-written text appended to the system prompt
 *   AI_PROVIDER         "anthropic" (default) | "openai_compatible"
 *   AI_MODEL            model id (default per provider below)
 *   AI_EFFORT           Claude effort: low | medium | high (default: low, a chat assistant)
 *   ANTHROPIC_API_KEY   key for provider "anthropic"
 *   AI_API_KEY          key for any provider (fallback for anthropic too)
 *   AI_BASE_URL         base URL for "openai_compatible" (e.g. https://api.openai.com/v1)
 *   AI_RATE_PER_MINUTE  messages per user per minute (default 10)
 *   AI_DAILY_LIMIT      messages per user per day (default 150; admins x3)
 */

const PROVIDERS = ['anthropic', 'openai_compatible'];

const DEFAULT_MODELS = {
  anthropic: 'claude-opus-5-5',
  openai_compatible: '',
};

const clean = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

// Placeholder for the admin keys store. Returns null until it exists.
async function readStoredSettings() {
  return null;
}

async function getAiSettings() {
  const stored = (await readStoredSettings()) || {};
  const env = process.env;

  let provider = (clean(stored.provider) || clean(env.AI_PROVIDER) || 'anthropic').toLowerCase();
  if (!PROVIDERS.includes(provider)) provider = 'anthropic';

  const apiKey = clean(stored.apiKey)
    || (provider === 'anthropic' ? clean(env.ANTHROPIC_API_KEY) : null)
    || clean(env.AI_API_KEY);

  const model = clean(stored.model) || clean(env.AI_MODEL) || DEFAULT_MODELS[provider];
  const baseUrl = clean(stored.baseUrl) || clean(env.AI_BASE_URL);
  const effort = ['low', 'medium', 'high'].includes(clean(env.AI_EFFORT)) ? clean(env.AI_EFFORT) : 'low';

  const switchedOff = (clean(stored.enabled) || clean(env.AI_ENABLED)) === 'false';
  const flag = (name, def) => {
    const v = clean(env[name]);
    return v === null ? def : v === 'true';
  };
  const roles = {
    admin: flag('AI_ADMIN_ENABLED', true),
    guest: flag('AI_GUEST_ENABLED', false),
    host: flag('AI_HOST_ENABLED', false),
  };
  const missing = [];
  if (!apiKey) missing.push('apiKey');
  if (!model) missing.push('model');
  if (provider === 'openai_compatible' && !baseUrl) missing.push('baseUrl');

  return {
    enabled: !switchedOff && missing.length === 0,
    switchedOff,
    missing,
    provider,
    model,
    baseUrl,
    effort,
    apiKey,
    roles,
    extraInstructions: (clean(env.AI_EXTRA_INSTRUCTIONS) || '').slice(0, 4000),
    ratePerMinute: parseInt(env.AI_RATE_PER_MINUTE, 10) || 10,
    dailyLimit: parseInt(env.AI_DAILY_LIMIT, 10) || 150,
  };
}

/** Settings safe to show an admin: never the key itself. */
function publicSettings(s) {
  return {
    enabled: s.enabled,
    switchedOff: s.switchedOff,
    missing: s.missing,
    provider: s.provider,
    model: s.model,
    baseUrl: s.baseUrl,
    effort: s.effort,
    roles: s.roles,
    hasExtraInstructions: !!s.extraInstructions,
    hasApiKey: !!s.apiKey,
    ratePerMinute: s.ratePerMinute,
    dailyLimit: s.dailyLimit,
  };
}

/** Whether this audience may use the assistant right now. */
function enabledFor(s, role) {
  return !!(s.enabled && s.roles && s.roles[role]);
}

module.exports = { getAiSettings, publicSettings, enabledFor, PROVIDERS, DEFAULT_MODELS };
