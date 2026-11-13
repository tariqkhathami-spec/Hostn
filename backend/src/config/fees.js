/**
 * Platform fees — the single place the commission rates live.
 *
 * Guest side: a service fee added on top of the stay (post-discount subtotal).
 * Host side:  a commission deducted from what the host receives, on the same
 *             base (post-discount subtotal; the cleaning fee is not charged).
 *
 * Every booking stores its own commission and host payout at creation time,
 * so changing a rate here never rewrites what an existing booking owes.
 *
 * Rates can be overridden per environment (e.g. a launch promotion) with
 * GUEST_SERVICE_FEE_RATE / HOST_COMMISSION_RATE, as fractions ("0.10").
 */

const rate = (envName, fallback) => {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : fallback;
};

const GUEST_SERVICE_FEE_RATE = rate('GUEST_SERVICE_FEE_RATE', 0.10);
const HOST_COMMISSION_RATE = rate('HOST_COMMISSION_RATE', 0.05);
const VAT_RATE = 0.15;

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * What the host receives for a booking, from its guest-side price parts.
 *   gross      = stay after discount + cleaning fee  (what the host charged)
 *   commission = HOST_COMMISSION_RATE x stay after discount
 *   payout     = gross - commission
 * The guest's service fee and the VAT are never part of the host's money.
 */
function hostShare({ subtotal = 0, discount = 0, cleaningFee = 0 } = {}) {
  const stay = Math.max(0, (Number(subtotal) || 0) - (Number(discount) || 0));
  const gross = r2(stay + (Number(cleaningFee) || 0));
  const hostCommission = r2(stay * HOST_COMMISSION_RATE);
  return {
    hostGross: gross,
    hostCommissionRate: HOST_COMMISSION_RATE,
    hostCommission,
    hostPayout: r2(gross - hostCommission),
  };
}

/**
 * Host payout of a stored booking. Bookings created before the commission
 * existed have no stored payout, so it is derived from their price parts.
 */
function hostPayoutOf(pricing) {
  if (!pricing) return 0;
  if (typeof pricing.hostPayout === 'number') return pricing.hostPayout;
  return hostShare(pricing).hostPayout;
}

/** Commission of a stored booking (same fallback rule as hostPayoutOf). */
function hostCommissionOf(pricing) {
  if (!pricing) return 0;
  if (typeof pricing.hostCommission === 'number') return pricing.hostCommission;
  return hostShare(pricing).hostCommission;
}

/** { gross, commission, payout } of a stored booking, for host statements. */
function hostBreakdownOf(pricing) {
  const commission = hostCommissionOf(pricing);
  const payout = hostPayoutOf(pricing);
  return { gross: r2(payout + commission), commission, payout };
}

module.exports = {
  hostBreakdownOf,
  GUEST_SERVICE_FEE_RATE,
  HOST_COMMISSION_RATE,
  VAT_RATE,
  hostShare,
  hostPayoutOf,
  hostCommissionOf,
};
