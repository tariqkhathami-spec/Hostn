/**
 * The one place money goes back to a guest.
 *
 * Every refund — admin, guest cancellation under the unit's policy, host
 * rejection — goes through refundPayment(), which moves the money at the
 * gateway first and only then records it. A refund is never recorded as done
 * when no money moved:
 *   - a simulator payment (no real money was taken) is recorded directly;
 *   - a real Moyasar payment needs MOYASAR_SECRET_KEY and a successful
 *     gateway answer, otherwise the refund fails and nothing is saved.
 */
const Payment = require('../models/Payment');

class RefundError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const r2 = (n) => Math.round(n * 100) / 100;
const toHalalas = (sar) => Math.round(Number(sar) * 100);

const LOCK_TTL_MS = 2 * 60 * 1000;
const REFUNDABLE_STATUSES = ['completed', 'paid', 'partially_refunded'];

const isSimulated = (payment) =>
  /^sim_/.test(payment.moyasarPaymentId || '') || /^simulated_/.test(payment.moyasarStatus || '');

/** What is still refundable on a payment, in SAR. */
const outstandingOf = (payment) => r2(Math.max(0, (payment.amount || 0) - (payment.refundedAmount || 0)));

async function moyasarRequest(method, path, data = null) {
  const base = process.env.MOYASAR_API_URL || 'https://api.moyasar.com/v1';
  const res = await globalThis.fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.MOYASAR_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

/**
 * Refund `amount` SAR (default: everything still outstanding) of a payment.
 * Returns { payment, refunded, fullyRefunded }. Throws RefundError.
 */
async function refundPayment(payment, { amount, reason } = {}) {
  if (!payment) throw new RefundError('Payment not found', 404);
  if (!REFUNDABLE_STATUSES.includes(payment.status)) {
    throw new RefundError(
      payment.status === 'refunded' ? 'Payment already refunded' : 'Only completed payments can be refunded',
    );
  }

  const outstanding = outstandingOf(payment);
  const refund = amount === undefined || amount === null ? outstanding : r2(Number(amount));
  if (!Number.isFinite(refund) || refund <= 0) throw new RefundError('Refund amount must be greater than zero');
  if (refund > outstanding) {
    throw new RefundError(`Refund amount exceeds what is left on the payment (${outstanding} SAR)`);
  }

  // One refund at a time per payment: two concurrent cancels/admin clicks must
  // not both reach the gateway. A stale lock (crashed request) expires.
  const now = new Date();
  const locked = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: payment.status,
      refundedAmount: payment.refundedAmount || 0,
      $or: [{ refundLockAt: null }, { refundLockAt: { $lt: new Date(now - LOCK_TTL_MS) } }],
    },
    { $set: { refundLockAt: now } },
    { new: true },
  );
  if (!locked) throw new RefundError('A refund on this payment is already in progress or it changed; reload and check', 409);

  try {
    return await refundLocked(locked, refund, reason);
  } finally {
    await Payment.updateOne({ _id: payment._id }, { $unset: { refundLockAt: 1 } }).catch(() => {});
  }
}

async function refundLocked(payment, refund, reason) {
  if (!isSimulated(payment)) {
    if (!payment.moyasarPaymentId) {
      throw new RefundError('Payment has no gateway reference; refund it manually from the gateway dashboard', 409);
    }
    if (!process.env.MOYASAR_SECRET_KEY) {
      throw new RefundError('Refunds are unavailable: the payment gateway is not configured', 503);
    }
    const { ok, body } = await moyasarRequest('POST', `/payments/${encodeURIComponent(payment.moyasarPaymentId)}/refund`, {
      amount: toHalalas(refund),
    });
    // Moyasar answers with the payment object; `refunded` is the running total.
    const gatewayRefunded = Number(body && body.refunded);
    if (!ok || (body && body.type && /error/.test(body.type)) || !(gatewayRefunded >= toHalalas((payment.refundedAmount || 0) + refund))) {
      throw new RefundError((body && body.message) || 'Refund failed at the payment gateway', 502);
    }
    payment.moyasarStatus = body.status || payment.moyasarStatus;
  }

  const refundedAmount = r2((payment.refundedAmount || 0) + refund);
  const fullyRefunded = refundedAmount >= r2(payment.amount);
  const update = {
    status: fullyRefunded ? 'refunded' : 'partially_refunded',
    refundedAmount,
    refundReason: reason || payment.refundReason,
    refundedAt: new Date(),
    moyasarStatus: payment.moyasarStatus,
  };
  const saved = await Payment.findByIdAndUpdate(payment._id, { $set: update }, { new: true });
  return { payment: saved, refunded: refund, fullyRefunded };
}

module.exports = { refundPayment, RefundError, outstandingOf, isSimulated, moyasarRequest, REFUNDABLE_STATUSES };
