/**
 * Admin page for integration keys (super admins only).
 *
 * Security model:
 *   - Only the MANAGE_INTEGRATIONS permission (super admins) reaches these routes.
 *   - Secret values are write-only: the API returns a masked form, never the value.
 *   - Every change needs a fresh step-up: a one-time code sent to the admin's
 *     own phone, exchanged for a 10-minute token bound to that admin.
 *   - Every change is written to the activity log (key name only, never the value).
 */

const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/ActivityLog');
const secretStore = require('../services/secretStore');
const authentica = require('../services/authentica');
const { GROUPS, getDefinition, validateValue } = require('../config/integrationKeys');

const STEP_UP_PURPOSE = 'integrations_stepup';
const STEP_UP_TTL_SECONDS = 10 * 60;

const isProduction = () => process.env.NODE_ENV === 'production';
const devBypass = () => process.env.DEV_OTP_BYPASS === 'true' && !isProduction();
const otpConfigured = () => Boolean(process.env.AUTHENTICA_API_KEY);

function log(req, action, details) {
  ActivityLog.create({
    actor: req.user._id,
    actorType: 'Admin',
    actorRole: 'admin',
    actorAdminRole: req.user.adminRole || 'super',
    action,
    details: String(details).slice(0, 500),
    ip: req.ip,
  }).catch(() => {});
}

function adminPhone(user) {
  return String(user.phone || '').replace(/[^\d]/g, '').replace(/^966/, '').replace(/^0/, '');
}

// GET /admin/integrations
exports.list = (req, res) => {
  res.json({
    success: true,
    data: {
      store: secretStore.status(),
      groups: GROUPS,
      keys: secretStore.describe(),
      stepUp: {
        // Without an OTP provider there is no second factor to ask for; the
        // first thing to set is then usually the Authentica key itself.
        required: otpConfigured() || devBypass(),
        phoneHint: adminPhone(req.user) ? `•••••${adminPhone(req.user).slice(-4)}` : null,
      },
    },
  });
};

// POST /admin/integrations/step-up/send
exports.sendStepUp = async (req, res, next) => {
  try {
    const phone = adminPhone(req.user);
    if (!/^5\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'لا يوجد رقم جوال سعودي مسجّل لحسابك.' });
    }
    if (devBypass()) {
      return res.json({ success: true, message: 'DEV: use 0000' });
    }
    if (!otpConfigured()) {
      return res.status(409).json({ success: false, message: 'مزوّد رسائل التحقق غير مُعدّ.' });
    }
    await authentica.sendOTP(phone, '+966', { method: 'sms', lang: 'ar' });
    return res.json({ success: true });
  } catch (err) {
    if (err.userMessage) return res.status(err.status || 503).json({ success: false, message: err.userMessage });
    return next(err);
  }
};

// POST /admin/integrations/step-up/verify  { otp }
exports.verifyStepUp = async (req, res, next) => {
  try {
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    if (!/^\d{4,6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'رمز غير صالح' });
    }
    const phone = adminPhone(req.user);
    const ok = devBypass() ? otp === '0000' : (await authentica.verifyOTP(phone, '+966', otp)).valid;
    if (!ok) return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });

    const token = jwt.sign(
      { id: String(req.user._id), tokenVersion: req.user.tokenVersion, purpose: STEP_UP_PURPOSE },
      process.env.JWT_SECRET,
      { expiresIn: STEP_UP_TTL_SECONDS }
    );
    log(req, 'integration_stepup_verified', 'Step-up verified for integration keys');
    return res.json({ success: true, data: { stepUpToken: token, expiresIn: STEP_UP_TTL_SECONDS } });
  } catch (err) {
    return next(err);
  }
};

/** Middleware: a valid step-up token for this admin, unless no OTP provider exists. */
exports.requireStepUp = (req, res, next) => {
  if (!otpConfigured() && !devBypass()) return next();
  const token = req.get('X-Step-Up-Token');
  if (!token) return res.status(403).json({ success: false, code: 'STEP_UP_REQUIRED', message: 'التحقق الإضافي مطلوب' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      decoded.purpose !== STEP_UP_PURPOSE ||
      decoded.id !== String(req.user._id) ||
      decoded.tokenVersion !== req.user.tokenVersion
    ) throw new Error('mismatch');
    return next();
  } catch {
    return res.status(403).json({ success: false, code: 'STEP_UP_REQUIRED', message: 'انتهت صلاحية التحقق، أعد التحقق' });
  }
};

// PUT /admin/integrations/:key  { value }
exports.setKey = async (req, res, next) => {
  try {
    const def = getDefinition(req.params.key);
    if (!def) return res.status(404).json({ success: false, message: 'Unknown key' });
    const value = typeof req.body?.value === 'string' ? req.body.value.trim() : req.body?.value;
    const error = validateValue(def, value);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!secretStore.isEnabled()) {
      return res.status(409).json({ success: false, code: 'STORE_DISABLED', message: 'SECRETS_MASTER_KEY غير مضبوط في Railway' });
    }
    await secretStore.set(def.key, value, req.user);
    log(req, 'integration_key_set', `Set ${def.key}`);
    const item = secretStore.describe().find((k) => k.key === def.key);
    return res.json({ success: true, data: item });
  } catch (err) {
    return next(err);
  }
};

// DELETE /admin/integrations/:key  — back to the environment variable
exports.clearKey = async (req, res, next) => {
  try {
    const def = getDefinition(req.params.key);
    if (!def) return res.status(404).json({ success: false, message: 'Unknown key' });
    await secretStore.clear(def.key);
    log(req, 'integration_key_cleared', `Cleared ${def.key}`);
    const item = secretStore.describe().find((k) => k.key === def.key);
    return res.json({ success: true, data: item });
  } catch (err) {
    return next(err);
  }
};
