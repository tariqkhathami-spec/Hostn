/**
 * OTP Service — Public API
 *
 * Usage:
 *   const otp = require('../services/otp');
 *   await otp.sendOTP(phone, countryCode, { method: 'sms', lang: 'ar' });
 *   await otp.verifyOTP(phone, countryCode, code);
 *   otp.getHealth(); // monitoring
 */

const manager = require('./manager');

module.exports = manager;
