const nodemailer = require('nodemailer');

/**
 * Email service — sends via Resend API (preferred) or SMTP (fallback).
 *
 * Priority:
 *  1. RESEND_API_KEY → uses Resend HTTP API (works from any cloud, no port issues)
 *  2. SMTP_HOST + SMTP_USER + SMTP_PASS → uses Nodemailer SMTP
 *  3. No config → console.log (dev mode)
 */

// ── Resend (HTTP API) ──────────────────────────────────────────────────
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  console.log('[EMAIL] Resend API configured');
}

// ── SMTP (Nodemailer) ─────────────────────────────────────────────────
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
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return null;
};

/**
 * Send an email via Resend API.
 */
const sendViaResend = async ({ to, subject, html, text, from }) => {
  console.log(`[EMAIL] Sending to ${to} via Resend API`);
  const { data, error } = await resendClient.emails.send({
    from,
    to: [to],
    subject,
    html,
    text,
  });
  if (error) {
    console.error(`[EMAIL] Resend error: ${error.message}`);
    throw new Error(error.message);
  }
  console.log(`[EMAIL] Resend OK — id: ${data.id}`);
  return { messageId: data.id, accepted: [to] };
};

/**
 * Send an email via SMTP.
 */
const sendViaSMTP = async ({ to, subject, html, text, from }) => {
  const transporter = createTransporter();
  if (!transporter) return null; // no SMTP configured

  console.log(`[EMAIL] Sending to ${to} via SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.log(`[EMAIL] SMTP OK — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL] SMTP failed — code: ${err.code}, message: ${err.message}`);
    throw err;
  }
};

/**
 * Send an email.
 * Tries Resend first, then SMTP, then falls back to console logging.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.SMTP_FROM || 'Hostn <noreply@hostn.co>';

  // 1. Resend API (preferred — HTTP-based, no port issues)
  if (resendClient) {
    return sendViaResend({ to, subject, html, text, from });
  }

  // 2. SMTP
  const transporter = createTransporter();
  if (transporter) {
    return sendViaSMTP({ to, subject, html, text, from });
  }

  // 3. Dev fallback
  console.log(`[DEV EMAIL] To: ${to}`);
  console.log(`[DEV EMAIL] Subject: ${subject}`);
  console.log(`[DEV EMAIL] Body: ${text || html}`);
  return { accepted: [to], dev: true };
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
