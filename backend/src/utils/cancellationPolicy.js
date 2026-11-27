/**
 * Cancellation policy — what a guest gets back when they cancel a paid booking.
 *
 * The unit's policy (Unit.cancellationPolicy) is the one the host picked and
 * the guest saw before paying (frontend UnitForm / booking page):
 *
 *   free       full refund until 12:00 noon (Riyadh) on the check-in day
 *   flexible   full refund until 2 days before the check-in day
 *   normal     full refund until 4 days before the check-in day
 *   restricted never refunded
 *
 * After the deadline the guest may still cancel (the dates open for the host
 * to sell again), but nothing is refunded.
 *
 * Check-in dates are stored as midnight UTC of the chosen calendar day
 * ("2026-12-01" → 2026-12-01T00:00Z), so the calendar day is read in UTC and
 * the deadline is placed on Riyadh time (UTC+3, no daylight saving).
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const POLICIES = ['free', 'flexible', 'normal', 'restricted'];
const DEFAULT_POLICY = 'flexible'; // Unit model default

/** Start (00:00 Riyadh) of the check-in calendar day, as epoch ms. */
function checkInDayStart(checkIn) {
  const d = new Date(checkIn);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - RIYADH_OFFSET_MS;
}

const normalizePolicy = (p) => (POLICIES.includes(p) ? p : DEFAULT_POLICY);

/** Last moment a full refund is allowed, or null when the policy never refunds. */
function refundDeadline(policy, checkIn) {
  const start = checkInDayStart(checkIn);
  switch (normalizePolicy(policy)) {
    case 'free': return new Date(start + 12 * HOUR);
    case 'flexible': return new Date(start - 2 * DAY);
    case 'normal': return new Date(start - 4 * DAY);
    default: return null; // restricted
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * What cancelling now would return to the guest.
 *   paidAmount      what the guest paid (Payment.amount); 0 for an unpaid booking
 *   refundedAmount  already returned on that payment (partial refunds)
 * Returns { policy, deadline, withinDeadline, refundAmount, retainedAmount }.
 */
function cancellationQuote({ policy, checkIn, paidAmount = 0, refundedAmount = 0, now = new Date() }) {
  const p = normalizePolicy(policy);
  const deadline = refundDeadline(p, checkIn);
  const withinDeadline = !!deadline && new Date(now).getTime() <= deadline.getTime();
  const outstanding = r2(Math.max(0, (Number(paidAmount) || 0) - (Number(refundedAmount) || 0)));
  const refundAmount = withinDeadline ? outstanding : 0;
  return {
    policy: p,
    deadline,
    withinDeadline,
    refundAmount,
    retainedAmount: r2(outstanding - refundAmount),
  };
}

module.exports = { POLICIES, DEFAULT_POLICY, refundDeadline, cancellationQuote, checkInDayStart };
