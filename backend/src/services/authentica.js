/**
 * Authentica OTP Service
 * https://authentica.sa — Saudi OTP provider
 *
 * Single OTP provider for Hostn:
 *   - Send OTP via SMS (primary) with WhatsApp fallback
 *   - Verify OTP codes
 *   - Retry logic with backoff
 *   - Clear error classification for user-facing messages
 *
 * API Docs: https://authenticasa.docs.apiary.io/#reference
 */

const https = require('https');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Authentica's SSL cert is mismatched from some regions (*.t2.sa instead of *.authentica.sa)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const AUTHENTICA_BASE_URL = 'https://api.authentica.sa/api/v2';
const API_KEY = process.env.AUTHENTICA_API_KEY;

// Template IDs (from https://portal.authentica.sa/templates/)
const TEMPLATE_ID_AR = 5;
const TEMPLATE_ID_EN = 6;

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const RETRY_DELAY_MS = 1500;      // 1.5 seconds before retry

// ── Error Classification ──────────────────────────────────────────

/**
 * Determine if an error is a transient infrastructure issue (worth retrying / falling back)
 */
function isTransientError(error) {
  if (error.status && error.status >= 500) return true;
  if (error.name === 'AbortError') return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up') ||
    msg.includes('certificate') ||
    msg.includes('network')
  );
}

/**
 * Build a user-facing error message based on the failure type
 */
function getUserErrorMessage(error, lang = 'ar') {
  // Rate limit
  if (error.status === 429 || (error.message && error.message.includes('Too many'))) {
    return lang === 'ar'
      ? 'طلبات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى.'
      : 'Too many requests. Please wait before trying again.';
  }

  // Invalid phone / bad request
  if (error.status === 400) {
    return lang === 'ar'
      ? 'رقم الهاتف غير صالح. تحقق من الرقم وحاول مرة أخرى.'
      : 'Invalid phone number. Please check and try again.';
  }

  // Auth issue (API key)
  if (error.status === 401 || error.status === 403) {
    console.error('[AUTHENTICA] API key issue — check AUTHENTICA_API_KEY');
    return lang === 'ar'
      ? 'خطأ في الخدمة. يرجى المحاولة لاحقاً.'
      : 'Service error. Please try again later.';
  }

  // Server / infrastructure issue
  if (isTransientError(error)) {
    return lang === 'ar'
      ? 'خدمة الرسائل غير متاحة حالياً. يرجى المحاولة بعد قليل.'
      : 'SMS service is temporarily unavailable. Please try again shortly.';
  }

  // Unknown
  return lang === 'ar'
    ? 'تعذر إرسال رمز التحقق. يرجى المحاولة مرة أخرى.'
    : 'Could not send verification code. Please try again.';
}

// ── Core API Request ──────────────────────────────────────────────

/**
 * Make a single API request to Authentica
 */
async function authenticaRequest(method, endpoint, body = null) {
  if (!API_KEY) {
    throw Object.assign(new Error('AUTHENTICA_API_KEY is not configured'), { status: 500 });
  }

  const url = `${AUTHENTICA_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Authorization': API_KEY,
    },
    signal: controller.signal,
    agent: httpsAgent,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.message || `Authentica API error: ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Send OTP ──────────────────────────────────────────────────────

/**
 * Send OTP to a phone number.
 *
 * Strategy:
 *   1. Try SMS first
 *   2. If SMS fails with a transient error → retry SMS once after 1.5s
 *   3. If SMS still fails → try WhatsApp
 *   4. If WhatsApp also fails → return clear user-facing error
 *
 * @param {string} phone - Phone without country code (e.g. "5XXXXXXXX")
 * @param {string} countryCode - e.g. "+966"
 * @param {object} options
 * @param {string} options.method - Requested method: "sms" or "whatsapp"
 * @param {string} options.lang - "ar" or "en"
 * @returns {Promise<{success, message, deliveryMethod}>}
 */
async function sendOTP(phone, countryCode = '+966', options = {}) {
  const { method = 'sms', lang = 'ar' } = options;
  const fullPhone = `${countryCode}${phone}`;
  const templateId = lang === 'en' ? TEMPLATE_ID_EN : TEMPLATE_ID_AR;

  // If user explicitly requested WhatsApp, try WhatsApp first
  const primaryMethod = method;
  const fallbackMethod = method === 'sms' ? 'whatsapp' : 'sms';

  // ── Attempt 1: Primary method ──
  try {
    const result = await _sendViaMethod(fullPhone, primaryMethod, templateId);
    console.log(`[AUTHENTICA] ✓ OTP sent to ${fullPhone} via ${primaryMethod}`);
    return { success: true, message: result.message || 'OTP sent successfully', deliveryMethod: primaryMethod };
  } catch (error) {
    console.warn(`[AUTHENTICA] ✗ ${primaryMethod} failed for ${fullPhone}: ${error.message}`);

    // If it's NOT a transient error (e.g. bad phone number), don't retry or fallback
    if (!isTransientError(error)) {
      throw Object.assign(error, { userMessage: getUserErrorMessage(error, lang) });
    }
  }

  // ── Attempt 2: Retry primary after backoff ──
  await _sleep(RETRY_DELAY_MS);
  try {
    const result = await _sendViaMethod(fullPhone, primaryMethod, templateId);
    console.log(`[AUTHENTICA] ✓ OTP sent to ${fullPhone} via ${primaryMethod} (retry)`);
    return { success: true, message: result.message || 'OTP sent successfully', deliveryMethod: primaryMethod };
  } catch (error) {
    console.warn(`[AUTHENTICA] ✗ ${primaryMethod} retry failed for ${fullPhone}: ${error.message}`);

    if (!isTransientError(error)) {
      throw Object.assign(error, { userMessage: getUserErrorMessage(error, lang) });
    }
  }

  // ── Attempt 3: Fallback to other method ──
  console.log(`[AUTHENTICA] Falling back to ${fallbackMethod} for ${fullPhone}...`);
  try {
    const result = await _sendViaMethod(fullPhone, fallbackMethod, templateId);
    console.log(`[AUTHENTICA] ✓ OTP sent to ${fullPhone} via ${fallbackMethod} (fallback)`);
    return { success: true, message: result.message || 'OTP sent successfully', deliveryMethod: fallbackMethod };
  } catch (error) {
    console.error(`[AUTHENTICA] ✗ All delivery methods failed for ${fullPhone}: ${error.message}`);

    // All methods failed — return user-friendly error
    const finalError = new Error(`Failed to send OTP: ${error.message}`);
    finalError.status = error.status || 503;
    finalError.userMessage = getUserErrorMessage(error, lang);
    throw finalError;
  }
}

/**
 * Send OTP via a specific method (sms or whatsapp)
 */
async function _sendViaMethod(fullPhone, method, templateId) {
  return authenticaRequest('POST', '/send-otp', {
    method,
    phone: fullPhone,
    template_id: templateId,
  });
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Verify OTP ────────────────────────────────────────────────────

/**
 * Verify an OTP code via Authentica
 *
 * @param {string} phone - Phone without country code
 * @param {string} countryCode
 * @param {string} otp - The code entered by the user
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function verifyOTP(phone, countryCode = '+966', otp) {
  const fullPhone = `${countryCode}${phone}`;

  try {
    const data = await authenticaRequest('POST', '/verify-otp', {
      phone: fullPhone,
      otp,
    });

    const isValid = data?.status === true || data?.success === true;

    if (isValid) {
      console.log(`[AUTHENTICA] ✓ OTP verified for ${fullPhone}`);
      return { valid: true, message: 'OTP verified successfully' };
    }

    console.log(`[AUTHENTICA] ✗ OTP invalid for ${fullPhone}`);
    return { valid: false, message: data?.message || 'Invalid OTP code' };
  } catch (error) {
    console.error(`[AUTHENTICA] ✗ Verification error for ${fullPhone}:`, error.message);
    // Return invalid (not throw) so the controller can respond gracefully
    return { valid: false, message: error.data?.message || error.message || 'OTP verification failed' };
  }
}

// ── Balance Check ─────────────────────────────────────────────────

async function getBalance() {
  try {
    const data = await authenticaRequest('GET', '/balance');
    return { balance: data?.data?.balance || 0 };
  } catch (error) {
    console.error('[AUTHENTICA] Failed to check balance:', error.message);
    return { balance: -1 };
  }
}

module.exports = { sendOTP, verifyOTP, getBalance, getUserErrorMessage };
