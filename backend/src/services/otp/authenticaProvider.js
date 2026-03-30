/**
 * Authentica OTP Provider
 * https://authentica.sa — Saudi OTP provider
 *
 * Handles sending and verifying OTPs via SMS and WhatsApp.
 * API Docs: https://authenticasa.docs.apiary.io/#reference
 */

const https = require('https');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Custom HTTPS agent — Authentica's SSL cert is mismatched from some regions
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const AUTHENTICA_BASE_URL = 'https://api.authentica.sa/api/v2';

// Template IDs (from https://portal.authentica.sa/templates/)
const TEMPLATE_ID_AR = 5;
const TEMPLATE_ID_EN = 6;

class AuthenticaProvider {
  constructor() {
    this.name = 'authentica';
    this.apiKey = process.env.AUTHENTICA_API_KEY;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Make an API request to Authentica
   */
  async _request(method, endpoint, body = null) {
    if (!this.apiKey) {
      throw new Error('AUTHENTICA_API_KEY is not configured');
    }

    const url = `${AUTHENTICA_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Authorization': this.apiKey,
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
        err.provider = this.name;
        throw err;
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Send OTP via Authentica (SMS or WhatsApp)
   * @param {string} phone - Phone without country code (e.g. "5XXXXXXXX")
   * @param {string} countryCode - e.g. "+966"
   * @param {object} options - { method: 'sms'|'whatsapp', lang: 'ar'|'en' }
   * @returns {Promise<{success: boolean, message: string, provider: string}>}
   */
  async sendOTP(phone, countryCode = '+966', options = {}) {
    const { method = 'sms', lang = 'ar' } = options;
    const fullPhone = `${countryCode}${phone}`;
    const templateId = lang === 'en' ? TEMPLATE_ID_EN : TEMPLATE_ID_AR;

    const payload = {
      method,
      phone: fullPhone,
      template_id: templateId,
    };

    const data = await this._request('POST', '/send-otp', payload);

    console.log(`[OTP:AUTHENTICA] OTP sent to ${fullPhone} via ${method}`);

    return {
      success: true,
      message: data?.message || 'OTP sent successfully',
      provider: this.name,
    };
  }

  /**
   * Verify OTP via Authentica
   * @param {string} phone
   * @param {string} countryCode
   * @param {string} otp
   * @returns {Promise<{valid: boolean, message: string, provider: string}>}
   */
  async verifyOTP(phone, countryCode = '+966', otp) {
    const fullPhone = `${countryCode}${phone}`;

    const data = await this._request('POST', '/verify-otp', {
      phone: fullPhone,
      otp,
    });

    const isValid = data?.status === true || data?.success === true;

    if (isValid) {
      console.log(`[OTP:AUTHENTICA] OTP verified for ${fullPhone}`);
      return { valid: true, message: 'OTP verified successfully', provider: this.name };
    }

    return { valid: false, message: data?.message || 'Invalid OTP code', provider: this.name };
  }

  /**
   * Check account balance
   */
  async getBalance() {
    try {
      const data = await this._request('GET', '/balance');
      return { balance: data?.data?.balance || 0 };
    } catch (error) {
      console.error('[OTP:AUTHENTICA] Failed to check balance:', error.message);
      return { balance: -1 };
    }
  }
}

module.exports = AuthenticaProvider;
