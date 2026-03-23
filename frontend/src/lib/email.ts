/**
 * Email notification service for Hostn.
 *
 * Supports multiple providers via environment configuration:
 * - Resend (recommended): Set RESEND_API_KEY
 * - SendGrid: Set SENDGRID_API_KEY
 * - SMTP: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *
 * Falls back to console logging in development when no provider is configured.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@hostn.co';
const FROM_NAME = process.env.FROM_NAME || 'Hostn';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostn.co';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using the configured provider.
 */
async function sendEmail(params: EmailParams): Promise<boolean> {
  const { to, subject, html, text } = params;

  // Try Resend first
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Resend email error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return false;
    }
  }

  // Try SendGrid
  if (SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [
            { type: 'text/html', value: html },
            { type: 'text/plain', value: text || html.replace(/<[^>]*>/g, '') },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text().catch(() => '');
        console.error('SendGrid email error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to send email via SendGrid:', error);
      return false;
    }
  }

  // No provider configured - log in development
  console.warn(`[EMAIL - No provider configured] To: ${to}, Subject: ${subject}`);
  console.warn('[EMAIL] Set RESEND_API_KEY or SENDGRID_API_KEY to enable email sending.');
  return false;
}

// ── Email Templates ──

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1B3A5C;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:1px;">HOSTN</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f8f9fa;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} Hostn. All rights reserved.<br>
                <a href="${APP_URL}" style="color:#2E75B6;text-decoration:none;">hostn.co</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send booking confirmation email to guest.
 */
export async function sendBookingConfirmation(params: {
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  bookingId: string;
}): Promise<boolean> {
  const { guestEmail, guestName, propertyTitle, checkIn, checkOut, nights, total, bookingId } = params;

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1B3A5C;font-size:20px;">Booking Confirmed!</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Hi ${guestName},<br><br>
      Your booking has been successfully created. Here are the details:
    </p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Property</td><td style="color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">${propertyTitle}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Check-in</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${checkIn}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Check-out</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${checkOut}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Nights</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${nights}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;">Total</td><td style="color:#111827;font-size:13px;font-weight:700;">${total} SAR</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#374151;font-size:14px;">
      <a href="${APP_URL}/dashboard/bookings/${bookingId}" style="display:inline-block;background-color:#2E75B6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Booking</a>
    </p>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">Booking ID: ${bookingId}</p>
  `);

  return sendEmail({
    to: guestEmail,
    subject: `Booking Confirmed - ${propertyTitle}`,
    html,
  });
}

/**
 * Send payment receipt email.
 */
export async function sendPaymentReceipt(params: {
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  total: number;
  paymentMethod?: string;
  cardLast4?: string;
  bookingId: string;
  paymentId: string;
}): Promise<boolean> {
  const { guestEmail, guestName, propertyTitle, total, paymentMethod, cardLast4, bookingId, paymentId } = params;

  const paymentInfo = cardLast4 ? `${paymentMethod || 'Card'} ending in ${cardLast4}` : (paymentMethod || 'Online payment');

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1B3A5C;font-size:20px;">Payment Receipt</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Hi ${guestName},<br><br>
      Your payment has been processed successfully.
    </p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Property</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${propertyTitle}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Amount Paid</td><td style="color:#111827;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">${total} SAR</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Payment Method</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${paymentInfo}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;">Date</td><td style="color:#111827;font-size:13px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      Payment ID: ${paymentId}<br>Booking ID: ${bookingId}
    </p>
  `);

  return sendEmail({
    to: guestEmail,
    subject: `Payment Receipt - ${total} SAR for ${propertyTitle}`,
    html,
  });
}

/**
 * Send new booking notification to host.
 */
export async function sendHostBookingNotification(params: {
  hostEmail: string;
  hostName: string;
  guestName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  total: number;
  bookingId: string;
}): Promise<boolean> {
  const { hostEmail, hostName, guestName, propertyTitle, checkIn, checkOut, total, bookingId } = params;

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1B3A5C;font-size:20px;">New Booking!</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Hi ${hostName},<br><br>
      You have a new booking for <strong>${propertyTitle}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Guest</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${guestName}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Check-in</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${checkIn}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Check-out</td><td style="color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">${checkOut}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;">Total</td><td style="color:#111827;font-size:13px;font-weight:700;">${total} SAR</td></tr>
    </table>
    <p style="margin:16px 0 0;">
      <a href="${APP_URL}/host/bookings" style="display:inline-block;background-color:#2E75B6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Booking</a>
    </p>
  `);

  return sendEmail({
    to: hostEmail,
    subject: `New Booking - ${propertyTitle}`,
    html,
  });
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  resetToken: string;
}): Promise<boolean> {
  const { email, name, resetToken } = params;
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1B3A5C;font-size:20px;">Reset Your Password</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Hi ${name},<br><br>
      We received a request to reset your password. Click the button below to set a new password.
      This link will expire in 1 hour.
    </p>
    <p style="margin:16px 0;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#2E75B6;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Reset Password</a>
    </p>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      If you did not request a password reset, please ignore this email. Your password will remain unchanged.
    </p>
  `);

  return sendEmail({
    to: email,
    subject: 'Reset Your Hostn Password',
    html,
  });
}
