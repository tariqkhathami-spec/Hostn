/**
 * SMS Service - Abstraction layer for sending SMS messages
 * In development: logs OTP to console
 * In production: uses Twilio or Unifonic (Saudi SMS provider)
 */

const sendSMS = async (phone, countryCode, message) => {
  const fullNumber = `${countryCode}${phone}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log('========================================');
    console.log(`[SMS] To: ${fullNumber}`);
    console.log(`[SMS] Message: ${message}`);
    console.log('========================================');
    return { success: true, provider: 'console' };
  }

  // Production: Use Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: fullNumber,
      });

      return { success: true, provider: 'twilio', sid: result.sid };
    } catch (error) {
      console.error('[SMS] Twilio error:', error.message);
      throw new Error('Failed to send SMS');
    }
  }

  // Fallback: log warning
  console.warn('[SMS] No SMS provider configured. OTP not sent.');
  console.log(`[SMS] To: ${fullNumber}, Message: ${message}`);
  return { success: true, provider: 'none' };
};

const sendOTPMessage = async (phone, countryCode, code) => {
  const message = `Your Hostn verification code is: ${code}. Valid for 5 minutes.`;
  return sendSMS(phone, countryCode, message);
};

module.exports = { sendSMS, sendOTPMessage };
