/**
 * Twilio Verify OTP Provider (Fallback)
 *
 * Uses Twilio Verify API for OTP delivery when primary provider is unavailable.
 * Twilio Verify handles OTP generation, delivery, and verification server-side.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID
 *
 * Twilio Verify API Docs:
 *   https://www.twilio.com/docs/verify/api
 */

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

class TwilioProvider {
  constructor() {
    this.name = 'twilio';
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    this.baseUrl = `https://verify.twilio.com/v2/Services/${this.serviceSid}`;
  }

  isConfigured() {
    return !!(this.accountSid && this.authToken && this.serviceSid);
  }

  /**
   * Build Basic Auth header for Twilio API
   */
  _authHeader() {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make a request to Twilio Verify API
   */
  async _request(method, endpoint, formData = null) {
    if (!this.isConfigured()) {
      throw new Error('Twilio Verify is not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID)');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const options = {
      method,
      headers: {
        'Authorization': this._authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    };

    if (formData) {
      options.body = new URLSearchParams(formData).toString();
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = new Error(data?.message || `Twilio API error: ${response.status}`);
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
   * Send OTP via Twilio Verify
   * @param {string} phone - Phone without country code (e.g. "5XXXXXXXX")
   * @param {string} countryCode - e.g. "+966"
   * @param {object} options - { method: 'sms'|'whatsapp', lang: 'ar'|'en' }
   * @returns {Promise<{success: boolean, message: string, provider: string}>}
   */
  async sendOTP(phone, countryCode = '+966', options = {}) {
    const { method = 'sms' } = options;
    const fullPhone = `${countryCode}${phone}`;

    // Twilio Verify channel mapping
    const channel = method === 'whatsapp' ? 'whatsapp' : 'sms';

    const data = await this._request('POST', '/Verifications', {
      To: fullPhone,
      Channel: channel,
    });

    console.log(`[OTP:TWILIO] Verification sent to ${fullPhone} via ${channel} (status: ${data.status})`);

    return {
      success: true,
      message: 'OTP sent successfully',
      provider: this.name,
    };
  }

  /**
   * Verify OTP via Twilio Verify
   * @param {string} phone
   * @param {string} countryCode
   * @param {string} otp
   * @returns {Promise<{valid: boolean, message: string, provider: string}>}
   */
  async verifyOTP(phone, countryCode = '+966', otp) {
    const fullPhone = `${countryCode}${phone}`;

    try {
      const data = await this._request('POST', '/VerificationCheck', {
        To: fullPhone,
        Code: otp,
      });

      const isValid = data.status === 'approved';

      if (isValid) {
        console.log(`[OTP:TWILIO] OTP verified for ${fullPhone}`);
        return { valid: true, message: 'OTP verified successfully', provider: this.name };
      }

      return { valid: false, message: 'Invalid OTP code', provider: this.name };
    } catch (error) {
      // Twilio returns 404 when verification not found or expired
      if (error.status === 404) {
        return { valid: false, message: 'OTP expired or not found. Please request a new one.', provider: this.name };
      }
      throw error;
    }
  }
}

module.exports = TwilioProvider;
