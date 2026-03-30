/**
 * Authentica OTP Service
 * https://authentica.sa — Saudi OTP provider
 *
 * Handles sending and verifying OTPs via SMS and WhatsApp.
 * The Authentica API generates, delivers, and verifies OTPs server-side.
 *
 * API Docs: https://authenticasa.docs.apiary.io/#reference
 */

const axios = require('axios');

const AUTHENTICA_BASE_URL = 'https://api.authentica.sa/api/v2';
const API_KEY = process.env.AUTHENTICA_API_KEY;

// Template IDs (from https://portal.authentica.sa/templates/)
// Arabic: "الرمز الخاص بك لتسجيل الدخول إلى {{app_name}} هو: {{otp}}. لا تشارك هذا الرمز مع أي شخص."
// English: "Your code for login to {{app_name}} is: {{otp}}. Do not share this code with anyone."
const TEMPLATE_ID_AR = 5;
const TEMPLATE_ID_EN = 6;

const authenticaClient = axios.create({
  baseURL: AUTHENTICA_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Attach API key to every request
authenticaClient.interceptors.request.use((config) => {
  if (!API_KEY) {
    throw new Error('AUTHENTICA_API_KEY is not configured');
  }
  config.headers['X-Authorization'] = API_KEY;
  return config;
});

/**
 * Send OTP to a phone number via SMS or WhatsApp
 *
 * @param {string} phone - Phone number without country code (e.g. "5XXXXXXXX")
 * @param {string} countryCode - Country code with + (e.g. "+966")
 * @param {object} options
 * @param {string} options.method - "sms" or "whatsapp" (default: "sms")
 * @param {string} options.lang - "ar" or "en" (default: "ar")
 * @param {string} options.fallbackMethod - Fallback delivery method if primary fails
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendOTP(phone, countryCode = '+966', options = {}) {
  const { method = 'sms', lang = 'ar', fallbackMethod = null } = options;

  const fullPhone = `${countryCode}${phone}`;
  const templateId = lang === 'en' ? TEMPLATE_ID_EN : TEMPLATE_ID_AR;

  const payload = {
    method,
    phone: fullPhone,
    template_id: templateId,
  };

  // Add fallback method if specified (e.g. send SMS, fallback to WhatsApp)
  if (fallbackMethod) {
    payload.fallback_phone = fullPhone;
  }

  try {
    const response = await authenticaClient.post('/send-otp', payload);

    console.log(`[AUTHENTICA] OTP sent to ${fullPhone} via ${method} (template: ${templateId})`);

    return {
      success: true,
      message: response.data?.message || 'OTP sent successfully',
    };
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    console.error(`[AUTHENTICA] Failed to send OTP to ${fullPhone}:`, errMsg);

    // If primary method fails and fallback is available, try fallback
    if (fallbackMethod && method !== fallbackMethod) {
      console.log(`[AUTHENTICA] Trying fallback method: ${fallbackMethod}`);
      return sendOTP(phone, countryCode, {
        ...options,
        method: fallbackMethod,
        fallbackMethod: null, // prevent infinite recursion
      });
    }

    throw new Error(`Failed to send OTP: ${errMsg}`);
  }
}

/**
 * Verify an OTP code
 *
 * @param {string} phone - Phone number without country code (e.g. "5XXXXXXXX")
 * @param {string} countryCode - Country code with + (e.g. "+966")
 * @param {string} otp - The OTP code entered by the user
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function verifyOTP(phone, countryCode = '+966', otp) {
  const fullPhone = `${countryCode}${phone}`;

  try {
    const response = await authenticaClient.post('/verify-otp', {
      phone: fullPhone,
      otp,
    });

    const isValid = response.data?.status === true || response.data?.success === true;

    if (isValid) {
      console.log(`[AUTHENTICA] OTP verified for ${fullPhone}`);
      return { valid: true, message: 'OTP verified successfully' };
    }

    return { valid: false, message: response.data?.message || 'Invalid OTP code' };
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    console.error(`[AUTHENTICA] OTP verification failed for ${fullPhone}:`, errMsg);

    // Return validation failure (not throw) so the controller can respond gracefully
    return { valid: false, message: errMsg || 'OTP verification failed' };
  }
}

/**
 * Check Authentica account balance
 * @returns {Promise<{balance: number}>}
 */
async function getBalance() {
  try {
    const response = await authenticaClient.get('/balance');
    return { balance: response.data?.data?.balance || 0 };
  } catch (error) {
    console.error('[AUTHENTICA] Failed to check balance:', error.message);
    return { balance: -1 };
  }
}

module.exports = { sendOTP, verifyOTP, getBalance };
