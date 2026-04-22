'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { bookingsApi, unitsApi } from '@/lib/api';
import { Loader2, Check, X, ChevronDown, ChevronUp, FileText, ArrowUpDown } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  calculateStayPricing,
  DISCOUNT_LABELS_EN,
  DISCOUNT_LABELS_AR,
  type PricingUnit,
  type DiscountBreakdownLine,
} from '@/lib/pricing';

interface Booking {
  _id: string;
  reference?: string;
  guest?: { _id?: string; name: string; email?: string; phone?: string };
  property?: { _id?: string; title: string; titleAr?: string };
  unit?: { _id: string; nameEn: string; nameAr: string } | null;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  totalPrice?: number;
  pricing?: {
    total?: number;
    perNight?: number;
    nights?: number;
    subtotal?: number;
    cleaningFee?: number;
    serviceFee?: number;
    discount?: number;
    vat?: number;
  };
  invoice?: { _id: string; invoiceNumber: string };
  createdAt?: string;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Bookings', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  reference: { en: 'Ref', ar: '\u0627\u0644\u0645\u0631\u062c\u0639' },
  guest: { en: 'Guest', ar: '\u0627\u0644\u0636\u064a\u0641' },
  property: { en: 'Property', ar: '\u0627\u0644\u0639\u0642\u0627\u0631' },
  unit: { en: 'Unit', ar: '\u0627\u0644\u0648\u062d\u062f\u0629' },
  checkIn: { en: 'Check-in', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' },
  status: { en: 'Status', ar: '\u0627\u0644\u062d\u0627\u0644\u0629' },
  amount: { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
  actions: { en: 'Actions', ar: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a' },
  accept: { en: 'Accept', ar: '\u0642\u0628\u0648\u0644' },
  decline: { en: 'Decline', ar: '\u0631\u0641\u0636' },
  viewInvoice: { en: 'View Invoice', ar: '\u0639\u0631\u0636 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' },
  noBookings: { en: 'No bookings yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0628\u0639\u062f' },
  accepted: { en: 'Booking accepted', ar: '\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062d\u062c\u0632' },
  declined: { en: 'Booking declined', ar: '\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u062d\u062c\u0632' },
  error: { en: 'Failed to update booking', ar: '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u062c\u0632' },
  all: { en: 'All', ar: '\u0627\u0644\u0643\u0644' },
  pending: { en: 'Pending', ar: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' },
  confirmed: { en: 'Confirmed', ar: '\u0645\u0624\u0643\u062f' },
  cancelled: { en: 'Cancelled', ar: '\u0645\u0644\u063a\u064a' },
  completed: { en: 'Completed', ar: '\u0645\u0643\u062a\u0645\u0644' },
  held: { en: 'Held', ar: 'محجوز مؤقتاً' },
  // Expansion labels
  bookingDetails: { en: 'Booking Details', ar: 'بيانات الحجز' },
  paymentDetails: { en: 'Payment Details', ar: 'بيانات الدفع' },
  paymentSummary: { en: 'Booking Summary', ar: 'ملخص الحجز' },
  numberOfNights: { en: 'Nights', ar: 'عدد الليالي' },
  paymentStatus: { en: 'Payment status', ar: 'حالة الدفع' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
  perNight: { en: 'Per night', ar: 'السعر لليلة' },
  subtotal: { en: 'Subtotal', ar: 'الإجمالي' },
  cleaningFee: { en: 'Cleaning fee', ar: 'رسوم التنظيف' },
  serviceFee: { en: 'Service fee', ar: 'رسوم الخدمة' },
  discount: { en: 'Discount', ar: 'الخصم' },
  vat: { en: 'VAT', ar: 'الضريبة' },
  total: { en: 'Total', ar: 'المجموع' },
  // Sort
  sortBy: { en: 'Sort by', ar: 'ترتيب حسب' },
  newest: { en: 'Newest first', ar: 'الأحدث' },
  oldest: { en: 'Oldest first', ar: 'الأقدم' },
  byCheckIn: { en: 'By check-in date', ar: 'بتاريخ الدخول' },
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  held: 'bg-purple-100 text-purple-700',
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  unpaid: 'bg-gray-50 text-gray-600',
  refunded: 'bg-orange-50 text-orange-700',
};

type SortMode = 'newest' | 'oldest' | 'checkIn';

export default function HostBookingsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'حجوزات المضيف' : 'Host Bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // PR J: cache of unit pricing data keyed by unitId. Fetched on-demand when
  // a row expands so we can compute the per-type discount breakdown that
  // matches the guest-side booking page. Units have many fields — we only
  // need the pricing-relevant subset.
  const [unitCache, setUnitCache] = useState<Record<string, PricingUnit>>({});

  const fetchUnitPricing = async (unitId: string) => {
    if (unitCache[unitId]) return;
    try {
      const res = await unitsApi.getOne(unitId);
      const u = res.data.data || res.data;
      setUnitCache((prev) => ({ ...prev, [unitId]: u as PricingUnit }));
    } catch {
      // Silent: breakdown falls back to the aggregate `pricing.discount` line.
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await bookingsApi.getHostBookings();
      setBookings(res.data.data || res.data || []);
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await bookingsApi.updateStatus(id, status);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status } : b))
      );
      toast.success(status === 'confirmed' ? t.accepted[lang] : t.declined[lang]);
    } catch {
      toast.error(t.error[lang]);
    }
  };

  const filtered = useMemo(() => {
    const base = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
    const sorted = [...base];
    if (sortMode === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (sortMode === 'checkIn') {
      sorted.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
    }
    return sorted;
  }, [bookings, filter, sortMode]);

  const dateOpts = { month: 'short' as const, day: 'numeric' as const, year: 'numeric' as const };
  const locale = isAr ? 'ar-u-nu-latn' : 'en-US';
  const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, dateOpts);
  const getNights = (b: Booking) =>
    b.pricing?.nights ?? Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);

  const propertyName = (b: Booking) =>
    (isAr ? b.property?.titleAr : b.property?.title) || b.property?.title || b.property?.titleAr || '-';
  const unitName = (b: Booking) =>
    b.unit ? ((isAr ? b.unit.nameAr : b.unit.nameEn) || b.unit.nameEn || b.unit.nameAr || '-') : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Filter + Sort row */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'held', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t[s]?.[lang] || s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <label className="text-sm text-gray-500">{t.sortBy[lang]}:</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-primary-400 outline-none"
          >
            <option value="newest">{t.newest[lang]}</option>
            <option value="oldest">{t.oldest[lang]}</option>
            <option value="checkIn">{t.byCheckIn[lang]}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          {t.noBookings[lang]}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-10 p-3"></th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.reference[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.guest[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.property[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.unit[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.checkIn[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.checkOut[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.status[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.amount[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.actions[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => {
                  const isExpanded = expandedId === booking._id;
                  const p = booking.pricing || {};
                  const nights = getNights(booking);
                  const total = p.total ?? booking.totalPrice ?? 0;
                  return (
                    <Row
                      key={booking._id}
                      booking={booking}
                      isExpanded={isExpanded}
                      onToggle={() => {
                        const nextId = isExpanded ? null : booking._id;
                        setExpandedId(nextId);
                        // On expand, fetch unit pricing so we can render the
                        // per-type discount breakdown (PR J).
                        if (nextId && booking.unit?._id) fetchUnitPricing(booking.unit._id);
                      }}
                      unitPricing={booking.unit?._id ? unitCache[booking.unit._id] : undefined}
                      propertyName={propertyName(booking)}
                      unitName={unitName(booking)}
                      formatDate={formatDate}
                      nights={nights}
                      total={total}
                      pricing={p}
                      lang={lang}
                      isAr={isAr}
                      handleStatusUpdate={handleStatusUpdate}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  booking: Booking;
  isExpanded: boolean;
  onToggle: () => void;
  propertyName: string;
  unitName: string;
  formatDate: (d: string) => string;
  nights: number;
  total: number;
  pricing: NonNullable<Booking['pricing']>;
  lang: 'en' | 'ar';
  isAr: boolean;
  handleStatusUpdate: (id: string, status: string) => void;
  /** PR J: optional unit pricing for per-type discount breakdown. */
  unitPricing?: PricingUnit;
}

function Row({
  booking,
  isExpanded,
  onToggle,
  propertyName,
  unitName,
  formatDate,
  nights,
  total,
  pricing,
  lang,
  isAr,
  handleStatusUpdate,
  unitPricing,
}: RowProps) {
  // PR J: compute the per-type discount breakdown when we have the unit's
  // full pricing data. Falls back to the legacy single aggregate line when
  // the unit hasn't been fetched yet or isn't available (e.g., non-unit
  // property bookings). The aggregate discount amount from `booking.pricing`
  // is still used when we can't produce a breakdown.
  const discountBreakdown: DiscountBreakdownLine[] = useMemo(() => {
    if (!unitPricing) return [];
    try {
      const bd = calculateStayPricing(unitPricing, new Date(booking.checkIn), new Date(booking.checkOut));
      return bd.discountBreakdown || [];
    } catch {
      return [];
    }
  }, [unitPricing, booking.checkIn, booking.checkOut]);
  return (
    <>
      {/* PR J: whole row is now clickable to toggle expand. Action buttons
          in the last cell call `stopPropagation` so clicking Accept/Reject
          doesn't also toggle the panel. */}
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
        <td className="p-3 font-mono text-xs text-gray-600">{booking.reference || '-'}</td>
        <td className="p-3 text-gray-900">{booking.guest?.name || '-'}</td>
        <td className="p-3 text-gray-700">{propertyName}</td>
        <td className="p-3 text-gray-600">{unitName}</td>
        <td className="p-3 text-gray-600">{formatDate(booking.checkIn)}</td>
        <td className="p-3 text-gray-600">{formatDate(booking.checkOut)}</td>
        <td className="p-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
            {t[booking.status]?.[lang] || booking.status}
          </span>
        </td>
        <td className="p-3 font-medium text-gray-900">
          {total ? (
            <span dir="ltr"><SarSymbol /> {total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {(booking.status === 'pending' || booking.status === 'held') && (
              <>
                <button
                  onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  title={t.accept[lang]}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title={t.decline[lang]}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                {booking.invoice?._id && (
                  <Link
                    href={`/finance/invoices/${booking.invoice._id}`}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title={t.viewInvoice[lang]}
                  >
                    <FileText className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title={t.cancelled[lang]}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded panel */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Booking Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                  {t.bookingDetails[lang]}
                </h3>
                <dl className="space-y-2 text-sm">
                  <Field label={t.property[lang]} value={propertyName} />
                  <Field label={t.unit[lang]} value={unitName} />
                  <Field label={t.checkIn[lang]} value={formatDate(booking.checkIn)} />
                  <Field label={t.checkOut[lang]} value={formatDate(booking.checkOut)} />
                  <Field label={t.numberOfNights[lang]} value={String(nights)} />
                </dl>
              </div>

              {/* Payment Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                  {t.paymentDetails[lang]}
                </h3>
                <dl className="space-y-2 text-sm">
                  <Field label={t.reference[lang]} value={<span className="font-mono text-xs">{booking.reference || '-'}</span>} />
                  <Field
                    label={t.paymentStatus[lang]}
                    value={
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[booking.paymentStatus || 'unpaid']}`}>
                        {t[booking.paymentStatus || 'unpaid']?.[lang] || booking.paymentStatus}
                      </span>
                    }
                  />
                  <Field
                    label={t.total[lang]}
                    value={<span dir="ltr" className="font-semibold"><SarSymbol /> {total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                  />
                </dl>
              </div>

              {/* Pricing breakdown — PR J: order price → discounts → cleaning
                  → service → vat → total, matching /search and /booking.
                  Per-type discount lines when unit data has loaded. */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                  {t.paymentSummary[lang]}
                </h3>
                <dl className="space-y-1.5 text-sm">
                  {pricing.perNight != null && (
                    <Field
                      label={`${pricing.perNight} × ${nights} ${isAr ? 'ليلة' : 'nights'}`}
                      value={<span dir="ltr"><SarSymbol /> {(pricing.subtotal ?? pricing.perNight * nights).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    />
                  )}
                  {discountBreakdown.length > 0 ? (
                    discountBreakdown.map((d) => (
                      <Field
                        key={d.type}
                        label={`${(isAr ? DISCOUNT_LABELS_AR : DISCOUNT_LABELS_EN)[d.type]} ${d.percent}%`}
                        value={<span dir="ltr" className="text-emerald-700">- <SarSymbol /> {d.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                      />
                    ))
                  ) : pricing.discount ? (
                    <Field
                      label={t.discount[lang]}
                      value={<span dir="ltr" className="text-emerald-700">- <SarSymbol /> {pricing.discount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    />
                  ) : null}
                  {pricing.cleaningFee ? (
                    <Field label={t.cleaningFee[lang]} value={<span dir="ltr"><SarSymbol /> {pricing.cleaningFee.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
                  ) : null}
                  {pricing.serviceFee ? (
                    <Field label={t.serviceFee[lang]} value={<span dir="ltr"><SarSymbol /> {pricing.serviceFee.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
                  ) : null}
                  {pricing.vat ? (
                    <Field label={t.vat[lang]} value={<span dir="ltr"><SarSymbol /> {pricing.vat.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
                  ) : null}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-sm font-semibold text-gray-900">
                    <span>{t.total[lang]}</span>
                    <span dir="ltr"><SarSymbol /> {total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="text-gray-900 text-sm">{value}</dd>
    </div>
  );
}
