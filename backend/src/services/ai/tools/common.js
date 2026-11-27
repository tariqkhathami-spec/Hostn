const mongoose = require('mongoose');

const isId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v);

const clampLimit = (v, def = 10, max = 25) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
};

const parseDate = (v) => {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

const cut = (s, n) => {
  if (typeof s !== 'string') return s;
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Booking references look like HB-XXXXXXXX.
const normalizeReference = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : '');

/** Compact booking view for the model. `audience` trims what each role may see. */
function bookingView(b, audience) {
  const property = b.property && typeof b.property === 'object' ? b.property : null;
  const unit = b.unit && typeof b.unit === 'object' ? b.unit : null;
  const guest = b.guest && typeof b.guest === 'object' ? b.guest : null;
  const view = {
    id: String(b._id),
    reference: b.reference,
    status: b.status,
    paymentStatus: b.paymentStatus,
    checkIn: day(b.checkIn),
    checkOut: day(b.checkOut),
    nights: b.pricing && b.pricing.nights,
    guests: b.guests,
    property: property ? (property.titleAr || property.title) : undefined,
    unit: unit ? (unit.nameAr || unit.nameEn) : undefined,
    createdAt: day(b.createdAt),
    cancellationReason: b.cancellationReason || undefined,
  };
  if (audience === 'admin') {
    view.total = b.pricing && b.pricing.total;
    view.hostPayout = b.pricing && b.pricing.hostPayout;
    view.guest = guest ? { id: String(guest._id), name: guest.name, phone: guest.phone } : undefined;
  } else if (audience === 'guest') {
    view.total = b.pricing && b.pricing.total;
  } else if (audience === 'host') {
    // Hosts see their share, never the guest's fees.
    view.hostPayout = b.pricing && b.pricing.hostPayout;
    view.guestName = guest ? guest.name : undefined;
  }
  return view;
}

const CANCELLATION_RULES = {
  free: { ar: 'إلغاء مجاني: يُسترد العربون عند الإلغاء قبل الساعة 12 ظهراً يوم الدخول', hoursBefore: 0, noonOfCheckIn: true },
  flexible: { ar: 'إلغاء مرن: يُسترد العربون عند الإلغاء قبل الدخول بيومين على الأقل', hoursBefore: 48 },
  normal: { ar: 'إلغاء عادي: يُسترد العربون عند الإلغاء قبل الدخول بأربعة أيام على الأقل', hoursBefore: 96 },
  restricted: { ar: 'إلغاء مقيد: لا يمكن استرداد المبلغ بعد الحجز', hoursBefore: null },
};

/** Whether cancelling `now` falls inside the unit's refund window. */
function cancellationQuote(policy, checkIn, now = new Date()) {
  const key = CANCELLATION_RULES[policy] ? policy : 'flexible';
  const rule = CANCELLATION_RULES[key];
  let refundable = false;
  let deadline = null;
  if (rule.hoursBefore !== null) {
    const start = new Date(checkIn);
    if (rule.noonOfCheckIn) {
      // 12 noon Saudi time (UTC+3) on the check-in day.
      deadline = new Date(`${day(start)}T12:00:00+03:00`);
    } else {
      deadline = new Date(start.getTime() - rule.hoursBefore * 3600 * 1000);
    }
    refundable = now < deadline;
  }
  return { policy: key, rule: rule.ar, refundableIfCancelledNow: refundable, refundDeadline: deadline ? deadline.toISOString() : null };
}

class ToolError extends Error {}

module.exports = {
  isId, clampLimit, parseDate, day, cut, escapeRegex, normalizeReference,
  bookingView, cancellationQuote, CANCELLATION_RULES, ToolError,
};
