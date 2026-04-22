/**
 * Shared discount + pricing helpers (PR E).
 *
 * Used by the booking widget (for the guest-facing price breakdown) and by the
 * host calendar (for the per-day discount badge + single-date dialog). The
 * backend mirrors the same logic in `backend/src/controllers/bookingController.js`
 * inside `calculateUnitPricing` — keep these two in sync.
 *
 * Stacking rule:
 *   effective% = min(100, sum(stackable applicable) + max(non-stackable applicable, 0))
 */

export type DiscountType = 'global' | 'weekly' | 'monthly' | 'weekday' | 'weekend' | 'date';

export interface ApplicableDiscount {
  type: DiscountType;
  percent: number;
  stackable: boolean;
}

// Minimum shape of the Unit data this module reads. Kept intentionally narrow
// so callers can pass their own broader types (Unit from `@/types`) without
// having to worry about required properties.
export interface PricingUnit {
  pricing?: {
    sunday?: number; monday?: number; tuesday?: number; wednesday?: number;
    thursday?: number; friday?: number; saturday?: number;
    discountPercent?: number;
    globalStackable?: boolean;
    globalEnabled?: boolean;
    weeklyDiscount?: number;
    weeklyStackable?: boolean;
    weeklyEnabled?: boolean;
    monthlyDiscount?: number;
    monthlyStackable?: boolean;
    monthlyEnabled?: boolean;
    cleaningFee?: number;
  };
  discountRules?: { type: 'weekday' | 'weekend'; percent: number; stackable?: boolean; enabled?: boolean }[];
  datePricing?: {
    date: string | Date;
    price?: number;
    isBlocked?: boolean;
    discountPercent?: number;
    discountStackable?: boolean;
  }[];
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const WEEKEND_DAY_INDICES = new Set([4, 5, 6]); // Thu, Fri, Sat

/**
 * Normalize a date input to a bare `YYYY-MM-DD` key.
 *
 * IMPORTANT (bug fix): Date objects are converted using LOCAL getters, not
 * `toISOString`. Calendar cells are rendered with `new Date(year, month, day)`
 * which is local midnight. In any timezone east of UTC, `toISOString()` would
 * roll the UTC date back by one day (e.g. Riyadh UTC+3: local April 19 00:00
 * = UTC April 18 21:00 → wrong key "2026-04-18"). Using local getters keeps
 * the cell key aligned with `formatDateKey` in the calendar page.
 *
 * String inputs are assumed to be ISO-8601 "bare date" prefixes (e.g.
 * "2026-04-19..." or "2026-04-19T00:00:00Z"), so slicing the first 10 chars
 * returns the calendar-date portion the backend actually stored.
 */
function toDateKey(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build a date-indexed map of per-date overrides for O(1) lookup. */
function buildDateOverrideMap(unit: PricingUnit) {
  const map = new Map<string, NonNullable<PricingUnit['datePricing']>[number]>();
  for (const dp of unit.datePricing || []) {
    map.set(toDateKey(dp.date), dp);
  }
  return map;
}

/**
 * Return the list of discounts that apply to a single night, given the stay
 * length (so long-stay discounts can decide if they kick in).
 *
 * `stayNights` is optional — when omitted, long-stay (weekly/monthly)
 * discounts are excluded. Use 0 or `undefined` when computing per-day
 * display for a calendar cell (no stay selected).
 */
export function applicableDiscountsForNight(
  unit: PricingUnit,
  date: Date,
  stayNights?: number,
): ApplicableDiscount[] {
  const discounts: ApplicableDiscount[] = [];
  const p = unit.pricing || {};

  // `enabled` defaults to true when undefined — existing units with no flag
  // still see their discounts apply as they always have.
  const isEnabled = (flag: boolean | undefined) => flag !== false;

  const globalPct = p.discountPercent || 0;
  if (globalPct > 0 && isEnabled(p.globalEnabled)) {
    discounts.push({ type: 'global', percent: globalPct, stackable: !!p.globalStackable });
  }

  if (stayNights != null && stayNights >= 7) {
    const wk = p.weeklyDiscount || 0;
    if (wk > 0 && isEnabled(p.weeklyEnabled)) {
      discounts.push({ type: 'weekly', percent: wk, stackable: !!p.weeklyStackable });
    }
  }
  if (stayNights != null && stayNights >= 30) {
    const mo = p.monthlyDiscount || 0;
    if (mo > 0 && isEnabled(p.monthlyEnabled)) {
      discounts.push({ type: 'monthly', percent: mo, stackable: !!p.monthlyStackable });
    }
  }

  // Weekday or weekend rule — whichever matches this day
  const isWeekend = WEEKEND_DAY_INDICES.has(date.getDay());
  const ruleType = isWeekend ? 'weekend' : 'weekday';
  const rule = (unit.discountRules || []).find((r) => r.type === ruleType);
  if (rule && rule.percent > 0 && isEnabled(rule.enabled)) {
    discounts.push({ type: ruleType, percent: rule.percent, stackable: !!rule.stackable });
  }

  // Date-specific discount (no enabled flag — per-date entries are only
  // present when the host has explicitly set them)
  const override = buildDateOverrideMap(unit).get(toDateKey(date));
  if (override && override.discountPercent && override.discountPercent > 0) {
    discounts.push({
      type: 'date',
      percent: override.discountPercent,
      stackable: !!override.discountStackable,
    });
  }

  return discounts;
}

/** Apply the stacking rule to a list of discounts → an effective percent capped at 100. */
export function effectiveDiscountPercent(discounts: ApplicableDiscount[]): number {
  let stackableSum = 0;
  let nonStackableMax = 0;
  for (const d of discounts) {
    if (d.stackable) stackableSum += d.percent;
    else if (d.percent > nonStackableMax) nonStackableMax = d.percent;
  }
  return Math.min(100, stackableSum + nonStackableMax);
}

/**
 * Mark which discounts actually contribute to the effective percent after
 * stacking. Stackable discounts always contribute; non-stackable ones only
 * contribute if they're the HIGHEST non-stackable percent (all others are
 * shadowed by the winner).
 *
 * Used by the single-date dialog to strike through discounts that don't
 * ultimately apply so the host knows why the effective percent isn't a
 * simple sum of everything they configured.
 */
export function markAppliedDiscounts(
  discounts: ApplicableDiscount[],
): (ApplicableDiscount & { isApplied: boolean })[] {
  // Find the highest non-stackable percent (if any ties, the first wins).
  let maxIdx = -1;
  let maxPct = -1;
  for (let i = 0; i < discounts.length; i++) {
    const d = discounts[i];
    if (!d.stackable && d.percent > maxPct) {
      maxPct = d.percent;
      maxIdx = i;
    }
  }
  return discounts.map((d, i) => ({
    ...d,
    isApplied: d.stackable || i === maxIdx,
  }));
}

/** Base (pre-discount) nightly price for a given date. */
export function baseNightPrice(unit: PricingUnit, date: Date): number {
  const override = buildDateOverrideMap(unit).get(toDateKey(date));
  if (override && override.price != null && override.price > 0) return override.price;
  const dayName = DAY_KEYS[date.getDay()];
  return unit.pricing?.[dayName] || 0;
}

/** Discounted nightly price for a given date + stay length. */
export function nightPriceAfterDiscount(unit: PricingUnit, date: Date, stayNights?: number): number {
  const base = baseNightPrice(unit, date);
  const pct = effectiveDiscountPercent(applicableDiscountsForNight(unit, date, stayNights));
  return Math.round(base * (1 - pct / 100));
}

export interface DiscountBreakdownLine {
  type: DiscountType;
  /** Display percent for this type — the highest per-night percent seen
   *  from this discount during the stay. */
  percent: number;
  /** Total SAR the guest saved from this specific discount (post-rounding). */
  amount: number;
  /** Whether it was stackable (affects how the effective rate combines). */
  stackable: boolean;
}

export interface StayPricing {
  perNight: number;
  nights: number;
  subtotal: number;
  subtotalAfterDiscount: number;
  discount: number;
  discountPercent: number; // effective % over the stay
  /** Set of discount types that contributed at least once during the stay. */
  appliedDiscountTypes: DiscountType[];
  /** Per-type breakdown for the booking-widget "Discount" lines. One entry
   *  per type that actually contributed savings; see PR G. */
  discountBreakdown: DiscountBreakdownLine[];
  cleaningFee: number;
  serviceFee: number;
  vat: number;
  total: number;
}

/** PR G: service fee rate applied to the POST-discount subtotal, pre-VAT. */
export const SERVICE_FEE_RATE = 0.11;

/**
 * Full pricing calculation for a stay — mirrors the backend's
 * `calculateUnitPricing`. Returns zeros for empty/invalid stays.
 */
export function calculateStayPricing(
  unit: PricingUnit,
  checkIn: Date | null,
  checkOut: Date | null,
): StayPricing {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return {
      perNight: 0, nights: 0, subtotal: 0, subtotalAfterDiscount: 0,
      discount: 0, discountPercent: 0, appliedDiscountTypes: [],
      discountBreakdown: [],
      cleaningFee: 0, serviceFee: 0, vat: 0, total: 0,
    };
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);

  // PR L: full-float precision throughout. The UI rounds to 2 decimals at
  // display time (via `formatPriceNumber`), so no per-step rounding here.
  // Keeps `150 × 10% discount + 11% service + 15% VAT` producing 172.33
  // instead of 173.00 from cumulative per-step `Math.round()`.
  const r2 = (n: number) => Math.round(n * 100) / 100;

  let subtotal = 0;
  let subtotalAfter = 0;
  const appliedTypes = new Set<DiscountType>();
  const byType = new Map<DiscountType, { percent: number; amount: number; stackable: boolean }>();

  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + i);
    const base = baseNightPrice(unit, d);
    const applicable = applicableDiscountsForNight(unit, d, nights);
    for (const a of applicable) appliedTypes.add(a.type);

    // Identify the winning non-stackable for THIS night.
    let winnerIdx = -1;
    let winnerPct = -1;
    for (let j = 0; j < applicable.length; j++) {
      const ap = applicable[j];
      if (!ap.stackable && ap.percent > winnerPct) {
        winnerPct = ap.percent;
        winnerIdx = j;
      }
    }

    // Sum effective percent (stackable + winning non-stackable), capped.
    let stackableSum = 0;
    for (const a of applicable) if (a.stackable) stackableSum += a.percent;
    const maxNonStackable = winnerIdx >= 0 ? applicable[winnerIdx].percent : 0;
    const pct = Math.min(100, stackableSum + maxNonStackable);

    subtotal += base;
    const nightAfter = base * (1 - pct / 100);
    subtotalAfter += nightAfter;

    // Attribute this night's savings proportionally to contributing discounts.
    const nightDiscount = base - nightAfter;
    if (nightDiscount > 0 && (stackableSum + maxNonStackable) > 0) {
      const totalPct = stackableSum + maxNonStackable;
      for (let j = 0; j < applicable.length; j++) {
        const ap = applicable[j];
        const counts = ap.stackable || j === winnerIdx;
        if (!counts) continue;
        const share = (nightDiscount * ap.percent) / totalPct;
        const existing = byType.get(ap.type);
        if (existing) {
          existing.amount += share;
          if (ap.percent > existing.percent) existing.percent = ap.percent;
        } else {
          byType.set(ap.type, { percent: ap.percent, amount: share, stackable: ap.stackable });
        }
      }
    }
  }

  const discountRaw = Math.max(0, subtotal - subtotalAfter);
  const discountPercent = subtotal > 0 ? r2((discountRaw / subtotal) * 100) : 0;
  const perNight = nights > 0 ? r2(subtotal / nights) : 0;
  const cleaningFee = r2(unit.pricing?.cleaningFee || 0);

  // Service fee + VAT at full float precision, rounded to 2dp at the end.
  const discountedSubtotal = Math.max(0, subtotal - discountRaw);
  const serviceFeeRaw = discountedSubtotal * SERVICE_FEE_RATE;
  const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
  const vatRaw = taxableRaw * 0.15;

  const discountBreakdown: DiscountBreakdownLine[] = Array.from(byType.entries())
    .filter(([, v]) => v.amount > 0)
    .map(([type, v]) => ({
      type,
      percent: r2(v.percent),
      amount: r2(v.amount),
      stackable: v.stackable,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    perNight,
    nights,
    subtotal: r2(subtotal),
    subtotalAfterDiscount: r2(subtotalAfter),
    discount: r2(discountRaw),
    discountPercent,
    appliedDiscountTypes: Array.from(appliedTypes),
    discountBreakdown,
    cleaningFee,
    serviceFee: r2(serviceFeeRaw),
    vat: r2(vatRaw),
    total: r2(taxableRaw + vatRaw),
  };
}

/**
 * Visual palette.
 *
 * Only discounts that show PER-DAY on the calendar get a unique color —
 * host can then see at a glance which type is applied on which day.
 * Weekly + monthly discounts depend on stay length (guest-selected) so they
 * never render on individual cells; they use a neutral gray badge in the
 * unified Discounts card so they don't imply a per-day impact.
 */
export const DISCOUNT_COLORS: Record<DiscountType, { bg: string; ring: string; text: string; dot: string }> = {
  global:  { bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  weekly:  { bg: 'bg-gray-50',    ring: 'ring-gray-200',    text: 'text-gray-700',    dot: 'bg-gray-400'    },
  monthly: { bg: 'bg-gray-50',    ring: 'ring-gray-200',    text: 'text-gray-700',    dot: 'bg-gray-400'    },
  weekday: { bg: 'bg-blue-50',    ring: 'ring-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  weekend: { bg: 'bg-cyan-50',    ring: 'ring-cyan-200',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  date:    { bg: 'bg-orange-50',  ring: 'ring-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
};

// PR H: labels always include the word "Discount" so a standalone line
// like "Global 10%" doesn't read as a nightly rate; now "Global Discount 10%".
export const DISCOUNT_LABELS_EN: Record<DiscountType, string> = {
  global:  'Global Discount',
  weekly:  'Weekly Discount (7+ nights)',
  monthly: 'Monthly Discount (30+ nights)',
  weekday: 'Weekday Discount',
  weekend: 'Weekend Discount',
  date:    'Date Discount',
};

export const DISCOUNT_LABELS_AR: Record<DiscountType, string> = {
  global:  'خصم عام',
  weekly:  'خصم أسبوعي (7+ ليالٍ)',
  monthly: 'خصم شهري (30+ ليلة)',
  weekday: 'خصم أيام الأسبوع',
  weekend: 'خصم نهاية الأسبوع',
  date:    'خصم تاريخ محدد',
};
