/**
 * Integration keys an admin can manage from the dashboard.
 *
 * Every entry here may be set from /admin/integrations, stored encrypted in
 * MongoDB, and read by the rest of the app through process.env as before
 * (see services/secretStore.js). A value saved in the dashboard wins over the
 * Railway environment variable of the same name; clearing it falls back to
 * the environment variable again.
 *
 * Bootstrap secrets are deliberately NOT listed and can never be set here:
 * MONGODB_URI, JWT_SECRET, SECRETS_MASTER_KEY, REDIS_URL, NODE_ENV, PORT.
 * They are needed before the database is reachable, or they protect the store.
 *
 * Fields:
 *   key       env var name the code already reads
 *   group     section on the admin page
 *   secret    true  -> never sent to the browser, shown masked
 *             false -> plain setting, shown in full (publishable keys, names)
 *   live      true  -> a change applies at once
 *             false -> the code reads it when the server starts; restart needed
 *   type      'text' (default) | 'multiline' | 'select' | 'boolean'
 *   allowCustom  select only: a value outside the options is accepted too
 */

const GROUPS = [
  { id: 'payments', ar: 'الدفع (ميسر)', en: 'Payments (Moyasar)' },
  { id: 'bnpl', ar: 'الدفع الآجل (تابي وتمارا)', en: 'Buy now, pay later (Tabby, Tamara)' },
  { id: 'otp', ar: 'رسائل التحقق (Authentica)', en: 'OTP (Authentica)' },
  { id: 'storage', ar: 'تخزين الصور', en: 'Image storage' },
  { id: 'email', ar: 'البريد الإلكتروني', en: 'Email' },
  { id: 'sms', ar: 'الرسائل النصية (Twilio)', en: 'SMS (Twilio)' },
  { id: 'push', ar: 'الإشعارات', en: 'Push notifications' },
  { id: 'maps', ar: 'الخرائط', en: 'Maps' },
  { id: 'ai', ar: 'الذكاء الاصطناعي', en: 'AI assistant' },
];

// Models offered in the AI model picker (Claude). With the OpenAI-compatible
// provider any model name may be typed instead (allowCustom).
const AI_MODELS = [
  { value: 'claude-opus-5-5', ar: 'Claude Opus 5.5 (الأذكى، الافتراضي)', en: 'Claude Opus 5.5 (default)' },
  { value: 'claude-sonnet-5-5', ar: 'Claude Sonnet 5.5 (متوازن وأرخص)', en: 'Claude Sonnet 5.5 (balanced, cheaper)' },
  { value: 'claude-haiku-5-5', ar: 'Claude Haiku 5.5 (الأسرع والأرخص)', en: 'Claude Haiku 5.5 (fastest, cheapest)' },
  { value: 'claude-fable-5-2', ar: 'Claude Fable 5.2 (الأقوى والأغلى)', en: 'Claude Fable 5.2 (most capable, priciest)' },
];

const AI_PROVIDERS = [
  { value: 'anthropic', ar: 'Claude (Anthropic) — الافتراضي', en: 'Claude (Anthropic) — default' },
  { value: 'openai_compatible', ar: 'مزوّد متوافق مع OpenAI', en: 'OpenAI-compatible provider' },
];

const KEYS = [
  // Payments — read when the server starts by paymentController.
  { key: 'MOYASAR_SECRET_KEY', group: 'payments', secret: true, live: false, ar: 'المفتاح السري', en: 'Secret key', hint: 'sk_live_… / sk_test_…' },
  { key: 'MOYASAR_PUBLISHABLE_KEY', group: 'payments', secret: false, live: true, ar: 'المفتاح العام', en: 'Publishable key', hint: 'pk_live_… / pk_test_…' },
  { key: 'MOYASAR_WEBHOOK_SECRET', group: 'payments', secret: true, live: false, ar: 'رمز الويب هوك (Secret Token)', en: 'Webhook secret token' },

  { key: 'TABBY_SECRET_KEY', group: 'bnpl', secret: true, live: true, ar: 'مفتاح تابي السري', en: 'Tabby secret key' },
  { key: 'TABBY_PUBLIC_KEY', group: 'bnpl', secret: false, live: true, ar: 'مفتاح تابي العام', en: 'Tabby public key' },
  { key: 'TABBY_MERCHANT_CODE', group: 'bnpl', secret: false, live: true, ar: 'رمز التاجر في تابي', en: 'Tabby merchant code' },
  { key: 'TAMARA_TOKEN', group: 'bnpl', secret: true, live: true, ar: 'توكن تمارا', en: 'Tamara API token' },
  { key: 'TAMARA_NOTIFICATION_TOKEN', group: 'bnpl', secret: true, live: true, ar: 'توكن إشعارات تمارا', en: 'Tamara notification token' },

  { key: 'AUTHENTICA_API_KEY', group: 'otp', secret: true, live: true, ar: 'مفتاح Authentica', en: 'Authentica API key' },

  { key: 'CLOUDINARY_CLOUD_NAME', group: 'storage', secret: false, live: true, ar: 'اسم حساب Cloudinary', en: 'Cloudinary cloud name' },
  { key: 'CLOUDINARY_API_KEY', group: 'storage', secret: false, live: true, ar: 'مفتاح Cloudinary', en: 'Cloudinary API key' },
  { key: 'CLOUDINARY_API_SECRET', group: 'storage', secret: true, live: true, ar: 'سر Cloudinary', en: 'Cloudinary API secret' },
  { key: 'AWS_ACCESS_KEY_ID', group: 'storage', secret: false, live: false, ar: 'AWS Access Key ID', en: 'AWS access key ID' },
  { key: 'AWS_SECRET_ACCESS_KEY', group: 'storage', secret: true, live: false, ar: 'AWS Secret Access Key', en: 'AWS secret access key' },
  { key: 'AWS_S3_BUCKET', group: 'storage', secret: false, live: false, ar: 'اسم S3 Bucket', en: 'S3 bucket' },
  { key: 'AWS_REGION', group: 'storage', secret: false, live: false, ar: 'منطقة AWS', en: 'AWS region', hint: 'eu-north-1' },
  { key: 'AWS_CLOUDFRONT_URL', group: 'storage', secret: false, live: true, ar: 'رابط CloudFront', en: 'CloudFront URL' },

  { key: 'RESEND_API_KEY', group: 'email', secret: true, live: false, ar: 'مفتاح Resend', en: 'Resend API key' },
  { key: 'SMTP_HOST', group: 'email', secret: false, live: false, ar: 'خادم SMTP', en: 'SMTP host' },
  { key: 'SMTP_PORT', group: 'email', secret: false, live: false, ar: 'منفذ SMTP', en: 'SMTP port', hint: '587' },
  { key: 'SMTP_USER', group: 'email', secret: false, live: false, ar: 'مستخدم SMTP', en: 'SMTP user' },
  { key: 'SMTP_PASS', group: 'email', secret: true, live: false, ar: 'كلمة مرور SMTP', en: 'SMTP password' },
  { key: 'SMTP_FROM', group: 'email', secret: false, live: true, ar: 'المرسل', en: 'From address', hint: 'Hostn <noreply@hostn.co>' },

  { key: 'TWILIO_ACCOUNT_SID', group: 'sms', secret: false, live: true, ar: 'Twilio Account SID', en: 'Twilio account SID' },
  { key: 'TWILIO_AUTH_TOKEN', group: 'sms', secret: true, live: true, ar: 'Twilio Auth Token', en: 'Twilio auth token' },
  { key: 'TWILIO_PHONE_NUMBER', group: 'sms', secret: false, live: true, ar: 'رقم Twilio', en: 'Twilio phone number' },

  { key: 'EXPO_ACCESS_TOKEN', group: 'push', secret: true, live: true, ar: 'Expo Access Token', en: 'Expo access token' },
  { key: 'FIREBASE_SERVICE_ACCOUNT', group: 'push', secret: true, live: false, type: 'multiline', ar: 'حساب خدمة Firebase (JSON)', en: 'Firebase service account (JSON)' },

  { key: 'GOOGLE_MAPS_SERVER_KEY', group: 'maps', secret: true, live: true, ar: 'مفتاح خرائط قوقل (الخادم)', en: 'Google Maps server key' },

  { key: 'ANTHROPIC_API_KEY', group: 'ai', secret: true, live: true, ar: 'مفتاح Claude (Anthropic)', en: 'Claude API key (Anthropic)', hint: 'sk-ant-…' },
  { key: 'AI_PROVIDER', group: 'ai', secret: false, live: true, type: 'select', options: AI_PROVIDERS, ar: 'مزوّد الذكاء الاصطناعي', en: 'AI provider' },
  { key: 'AI_API_KEY', group: 'ai', secret: true, live: true, ar: 'مفتاح المزوّد الآخر (متوافق مع OpenAI)', en: 'Other provider API key (OpenAI-compatible)' },
  { key: 'AI_BASE_URL', group: 'ai', secret: false, live: true, ar: 'رابط المزوّد الآخر', en: 'Other provider base URL', hint: 'https://api.openai.com/v1' },
  { key: 'AI_MODEL', group: 'ai', secret: false, live: true, type: 'select', allowCustom: true, options: AI_MODELS, ar: 'المودل', en: 'Model' },
  { key: 'AI_ADMIN_ENABLED', group: 'ai', secret: false, live: true, type: 'boolean', ar: 'تفعيل مساعد الإدارة', en: 'Admin assistant on' },
  { key: 'AI_GUEST_ENABLED', group: 'ai', secret: false, live: true, type: 'boolean', ar: 'تفعيل مساعد العملاء', en: 'Guest assistant on' },
  { key: 'AI_HOST_ENABLED', group: 'ai', secret: false, live: true, type: 'boolean', ar: 'تفعيل مساعد الملاك', en: 'Host assistant on' },
  { key: 'AI_EXTRA_INSTRUCTIONS', group: 'ai', secret: false, live: true, type: 'multiline', ar: 'تعليمات إضافية للمساعد (سياسات، نبرة الرد…)', en: 'Extra assistant instructions' },
];

const BY_KEY = new Map(KEYS.map((k) => [k.key, k]));

// Never manageable from the dashboard, whatever the registry says.
const BOOTSTRAP_ONLY = new Set(['MONGODB_URI', 'JWT_SECRET', 'SECRETS_MASTER_KEY', 'REDIS_URL', 'NODE_ENV', 'PORT']);

const MAX_VALUE_LENGTH = 10000; // a Firebase service account JSON is ~2.5 KB

function getDefinition(key) {
  if (BOOTSTRAP_ONLY.has(key)) return null;
  return BY_KEY.get(key) || null;
}

/** Validate a value for a key. Returns an error message or null. */
function validateValue(def, value) {
  if (typeof value !== 'string') return 'Value must be a string';
  if (value.length === 0) return 'Value is empty';
  if (value.length > MAX_VALUE_LENGTH) return 'Value is too long';
  if (def.type === 'boolean' && !['true', 'false'].includes(value)) return 'Value must be true or false';
  if (def.type === 'select' && !def.options.some((o) => o.value === value)) {
    if (!def.allowCustom || !/^[\w.:/-]{1,100}$/.test(value)) return 'Unknown option';
  }
  if (def.key === 'FIREBASE_SERVICE_ACCOUNT') {
    try { JSON.parse(value); } catch { return 'Must be valid JSON'; }
  }
  if (def.type !== 'multiline' && /[\r\n]/.test(value)) return 'Value must be a single line';
  return null;
}

module.exports = { GROUPS, KEYS, AI_MODELS, BOOTSTRAP_ONLY, getDefinition, validateValue };
