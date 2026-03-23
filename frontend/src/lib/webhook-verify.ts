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
 * SECURITY: This function enforces strict signature verification.
 * - MOYASAR_WEBHOOK_SECRET MUST be set or verification throws an error.
 * - Missing or invalid signatures always return false.
 * - Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody - The raw request body string
 * @param signature - The signature from the webhook header
 * @returns true if signature is valid, false otherwise
 * @throws Error if MOYASAR_WEBHOOK_SECRET is not configured
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  // SECURITY: Webhook secret MUST be configured in production
  if (!WEBHOOK_SECRET) {
    throw new Error(
      '[CRITICAL] MOYASAR_WEBHOOK_SECRET is not configured. ' +
      'Webhook processing is disabled until this environment variable is set. ' +
      'Get the webhook secret from your Moyasar dashboard and add it to Vercel environment variables.'
    );
  }

  // Reject webhooks with no signature header
  if (!signature) {
    console.warn('Webhook rejected: no signature header provided');
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
