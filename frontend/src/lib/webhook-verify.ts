import crypto from 'crypto';

/**
 * Webhook signature verification using HMAC-SHA256.
 *
 * Moyasar sends webhook signatures in the request headers.
 * Set MOYASAR_WEBHOOK_SECRET in environment variables (from Moyasar dashboard).
 *
 * The signature is computed as HMAC-SHA256(webhook_secret, raw_body).
 */

const WEBHOOK_SECRET = process.env.MOYASAR_WEBHOOK_SECRET;

/**
 * Verify the HMAC signature of a webhook payload.
 *
 * @param rawBody - The raw request body string
 * @param signature - The signature from the webhook header
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  // If no webhook secret is configured, warn and skip verification
  if (!WEBHOOK_SECRET) {
    console.warn(
      '[SECURITY WARNING] MOYASAR_WEBHOOK_SECRET is not configured. ' +
      'Webhook signature verification is disabled. ' +
      'Set this environment variable from your Moyasar dashboard for production security.'
    );
    // Return true to allow processing but log the warning
    // The server-side payment re-verification with Moyasar API still protects against forged webhooks
    return true;
  }

  // If webhook secret is configured but no signature provided, reject
  if (!signature) {
    console.warn('Webhook received without signature header');
    return false;
  }

  try {
    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}
