const nodemailer = require('nodemailer');

/**
 * Create mail transporter.
 * Uses SMTP_* env vars in production, falls back to console logging in dev.
 */
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 8000, // 8s to establish connection
      greetingTimeout: 8000,   // 8s for SMTP greeting
      socketTimeout: 10000,    // 10s for socket inactivity
    });
  }
  return null;
};

/**
 * Send an email.
 * Falls back to console.log when no SMTP is configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[DEV EMAIL] To: ${to}`);
    console.log(`[DEV EMAIL] Subject: ${subject}`);
    console.log(`[DEV EMAIL] Body: ${text || html}`);
    return { accepted: [to], dev: true };
  }

  const from = process.env.SMTP_FROM || 'Hostn <noreply@hostn.co>';
  const info = await transporter.sendMail({ from, to, subject, html, text });
  return info;
};

/**
 * Send email verification code.
 */
const sendVerificationCode = async (email, code, lang = 'en') => {
  const isAr = lang === 'ar';
  const subject = isAr ? 'رمز التحقق من Hostn' : 'Hostn Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; direction: ${isAr ? 'rtl' : 'ltr'};">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">${isAr ? 'رمز التحقق' : 'Verification Code'}</h2>
      <p style="color: #555; font-size: 14px; margin-bottom: 20px;">
        ${isAr ? 'استخدم الرمز التالي لتأكيد بريدك الإلكتروني:' : 'Use the following code to verify your email address:'}
      </p>
      <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
      </div>
      <p style="color: #888; font-size: 12px;">
        ${isAr ? 'ينتهي هذا الرمز خلال 15 دقيقة.' : 'This code expires in 15 minutes.'}
      </p>
    </div>
  `;
  const text = isAr
    ? `رمز التحقق الخاص بك: ${code} — ينتهي خلال 15 دقيقة.`
    : `Your verification code is: ${code} — expires in 15 minutes.`;

  return sendEmail({ to: email, subject, html, text });
};

module.exports = { sendEmail, sendVerificationCode };
