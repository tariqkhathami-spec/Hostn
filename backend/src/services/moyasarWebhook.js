/**
 * Moyasar webhook helpers (pure functions, no DB access).
 *
 * Moyasar does not sign webhooks with an HMAC header. Each delivery is a JSON
 * event whose body carries the `secret_token` you chose when creating the
 * webhook in the dashboard (Settings → Webhooks). The receiver compares it to
 * its own copy. Event shape (docs.moyasar.com/api/other/webhooks/webhook-reference):
 *
 *   { id, type, created_at, secret_token, account_name, live, data }
 *
 * For `payment_*` events, `data` is the payment object (id, status, amount,
 * refunded, currency, source, metadata, ...). Amounts are in halalas.
 */
const crypto = require('crypto');

/** Constant-time comparison of the body's secret_token with our secret. */
function verifySecretToken(body, secret) {
  if (!secret) return false;
  const token = body && typeof body === 'object' ? body.secret_token : undefined;
  if (typeof token !== 'string' || token.length === 0) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = crypto.createHash('sha256').update(token, 'utf8').digest();
  const b = crypto.createHash('sha256').update(String(secret), 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

// What each payment event means for our Payment record.
const PAYMENT_EVENT_ACTIONS = {
  payment_paid: 'paid',
  payment_captured: 'paid',
  payment_failed: 'failed',
  payment_refunded: 'refunded',
  payment_voided: 'voided',
  payment_authorized: 'ignore', // we use auto-capture; `paid` follows
  payment_verified: 'ignore',
};

/**
 * Normalise a verified webhook body into what the handler needs.
 * Returns { eventId, type, live, action, payment } or { error }.
 */
function parseEvent(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid payload' };
  const { id: eventId, type, live, data } = body;
  if (!eventId || !type) return { error: 'Invalid payload' };

  if (type === 'webhook_verification') {
    return { eventId, type, live, action: 'verification', code: data?.verification_code };
  }

  const action = PAYMENT_EVENT_ACTIONS[type];
  if (!action) return { eventId, type, live, action: 'ignore' };

  if (!data || typeof data !== 'object' || !data.id) return { error: 'Missing payment data' };

  return {
    eventId,
    type,
    live,
    action,
    payment: {
      id: data.id,
      status: data.status,
      amount: data.amount, // halalas
      refunded: data.refunded || 0, // halalas
      currency: data.currency,
      source: data.source,
      metadata: data.metadata || {},
    },
  };
}

module.exports = { verifySecretToken, parseEvent, PAYMENT_EVENT_ACTIONS };
