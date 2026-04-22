'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';
import { formatPrice, formatPriceNumber, calculateNights, getDiscountedPrice, getNightLabel, getGuestLabel } from '@/lib/utils';
import { Calendar, Users, Minus, Plus } from 'lucide-react';
import MiniCalendar from '@/components/ui/MiniCalendar';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import BnplWidget from '@/components/payment/BnplWidget';
import SarSymbol from '@/components/ui/SarSymbol';
import { saveSearchCookies } from '@/lib/searchCookies';
import { bookingsApi, unitsApi } from '@/lib/api';
import {
  calculateStayPricing,
  SERVICE_FEE_RATE,
  DISCOUNT_LABELS_EN,
  DISCOUNT_LABELS_AR,
  type PricingUnit,
  type DiscountBreakdownLine,
} from '@/lib/pricing';

interface BookingWidgetProps {
  property: Property;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialUnitId?: string;
}

export default function BookingWidget({ property, initialCheckIn = '', initialCheckOut = '', initialAdults = 0, initialChildren = 0, initialUnitId = '' }: BookingWidgetProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isAr = language === 'ar';
  const [holdLoading, setHoldLoading] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults > 0 ? initialAdults : 1);
  const [children, setChildren] = useState(initialChildren > 0 ? initialChildren : 0);
  const guests = adults + children;
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  // ── Unit selection ──
  interface UnitOption { _id: string; nameEn?: string; nameAr?: string; pricing?: Record<string, number>; capacity?: { maxGuests?: number }; datePricing?: { date: string; price?: number; isBlocked?: boolean }[]; discountRules?: { type: string; percent: number }[] }
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const selectedUnit = units.find((u) => u._id === selectedUnitId) || null;
  const [unitBookedDates, setUnitBookedDates] = useState<string[]>([]);
  // PR G: track the start-of-booking dates separately. They're still blocked
  // for check-in (can't stay on top of a booking) but VALID for check-out
  // (morning checkout → next guest's afternoon check-in).
  const [unitBookingStartDates, setUnitBookingStartDates] = useState<Set<string>>(new Set());

  // Fetch units for this property
  useEffect(() => {
    unitsApi.getForProperty(property._id, { limit: 50 })
      .then((res) => {
        const data: UnitOption[] = res.data.data || [];
        setUnits(data);
        // Auto-select first unit if only one exists
        if (data.length === 1) setSelectedUnitId(data[0]._id);
      })
      .catch(() => {});
  }, [property._id]);

  // Fetch unit-specific booked dates when selected unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setUnitBookedDates([]);
      setUnitBookingStartDates(new Set());
      return;
    }
    bookingsApi.getUnitBookedDates(selectedUnitId)
      .then((res) => {
        const bookings = res.data.data || [];
        const dates: string[] = [];
        const starts = new Set<string>();
        for (const b of bookings as { checkIn: string; checkOut: string }[]) {
          const start = new Date(b.checkIn);
          const end = new Date(b.checkOut);
          starts.add(new Date(start).toISOString().slice(0, 10));
          for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d).toISOString().slice(0, 10));
          }
        }
        setUnitBookedDates(dates);
        setUnitBookingStartDates(starts);
      })
      .catch(() => {
        setUnitBookedDates([]);
        setUnitBookingStartDates(new Set());
      });
  }, [selectedUnitId]);

  // Persist dates and guests to cookies whenever they change
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    saveSearchCookies({ checkIn, checkOut, adults, children });
  }, [checkIn, checkOut, adults, children]);

  const handleDateSelect = (dateStr: string) => {
    if (!selectingCheckOut || !checkIn) {
      setCheckIn(dateStr);
      setCheckOut('');
      setSelectingCheckOut(true);
    } else {
      if (dateStr > checkIn) {
        setCheckOut(dateStr);
        setSelectingCheckOut(false);
        setShowCalendar(false);
      } else {
        setCheckIn(dateStr);
        setCheckOut('');
      }
    }
  };

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;

  // Preview: when only checkIn is set, show 1-night preview price
  const previewPricePerNight = (() => {
    if (!(checkIn && !checkOut && selectedUnit?.pricing)) return 0;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const checkInDate = new Date(checkIn + 'T00:00:00');
    if (selectedUnit.datePricing) {
      const dateKey = checkInDate.toISOString().slice(0, 10);
      const override = (selectedUnit.datePricing as { date: string; price?: number; isBlocked?: boolean }[])
        .find(dp => new Date(dp.date).toISOString().slice(0, 10) === dateKey);
      if (override?.price && !override?.isBlocked) return override.price;
    }
    return selectedUnit.pricing[dayNames[checkInDate.getDay()]] || 0;
  })();

  // ── Calculate pricing: unit per-day rates vs property flat rate ──
  // PR E: uses the shared `calculateStayPricing` helper which implements the
  // new stackable-aware discount formula. The property-only fallback keeps
  // the legacy flat-rate path for (old) properties without units.
  const hasUnit = !!selectedUnit;
  let pricePerNight: number;
  let subtotal: number;
  let cleaningFee: number;
  let discount: number;
  let discountLabel = '';
  let appliedDiscountPct = 0;
  let serviceFee: number;
  let vat: number;
  let total: number;
  // PR G: per-type breakdown for the booking widget. Empty when no discount
  // applies or when using the legacy property-only pricing path.
  let discountBreakdown: DiscountBreakdownLine[] = [];

  if (hasUnit && selectedUnit.pricing && nights > 0) {
    const ci = new Date(checkIn);
    const co = new Date(checkIn);
    co.setDate(co.getDate() + nights);
    const breakdown = calculateStayPricing(selectedUnit as PricingUnit, ci, co);
    pricePerNight = breakdown.perNight;
    subtotal = breakdown.subtotal;
    cleaningFee = breakdown.cleaningFee;
    discount = breakdown.discount;
    appliedDiscountPct = breakdown.discountPercent;
    serviceFee = breakdown.serviceFee;
    vat = breakdown.vat;
    total = breakdown.total;
    discountBreakdown = breakdown.discountBreakdown;
    // Headline label: prefer the long-stay types (weekly/monthly) when they
    // contributed, else fall back to whichever type appears first.
    const types = breakdown.appliedDiscountTypes;
    if (types.includes('monthly')) discountLabel = isAr ? 'خصم شهري' : 'Monthly Discount';
    else if (types.includes('weekly')) discountLabel = isAr ? 'خصم أسبوعي' : 'Weekly Discount';
    else if (types.includes('global')) discountLabel = isAr ? 'خصم عام' : 'Global Discount';
    else if (types.length > 0) discountLabel = isAr ? 'خصم' : 'Discount';
  } else {
    pricePerNight = property.pricing?.perNight ?? 0;
    subtotal = nights * pricePerNight;
    cleaningFee = property.pricing?.cleaningFee || 0;
    const propDiscPct = property.pricing?.discountPercent ?? 0;
    appliedDiscountPct = propDiscPct;
    discountLabel = propDiscPct > 0 ? (isAr ? 'خصم عام' : 'Global Discount') : '';
    // PR L: 2-decimal precision — full floats, round to 2dp only at the end.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    discount = propDiscPct > 0 ? r2(subtotal * (propDiscPct / 100)) : 0;
    // PR G: service fee = 11% of the post-discount subtotal, pre-VAT.
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceFeeRaw = discountedSubtotal * SERVICE_FEE_RATE;
    serviceFee = r2(serviceFeeRaw);
    const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
    const vatRaw = taxableRaw * 0.15;
    vat = r2(vatRaw);
    total = r2(taxableRaw + vatRaw);
  }

  // Check if any selected dates are blocked
  const hasBlockedDates = (() => {
    if (!selectedUnit?.datePricing || !checkIn || !checkOut || nights <= 0) return false;
    const overrides = new Map<string, { isBlocked?: boolean }>();
    for (const dp of selectedUnit.datePricing) {
      overrides.set(new Date(dp.date).toISOString().slice(0, 10), dp);
    }
    const s = new Date(checkIn);
    for (let i = 0; i < nights; i++) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      if (overrides.get(d.toISOString().slice(0, 10))?.isBlocked) return true;
    }
    return false;
  })();

  const handleBookNow = async () => {
    if (!checkIn || !checkOut) {
      toast.error(t('booking.selectDates'));
      return;
    }
    if (nights <= 0) {
      toast.error(t('booking.checkOutAfter'));
      return;
    }
    if (property.rules?.minNights && nights < property.rules.minNights) {
      toast.error(isAr
        ? `الحد الأدنى للإقامة ${getNightLabel(property.rules.minNights, 'ar')}`
        : `Minimum stay is ${getNightLabel(property.rules.minNights, 'en')}`);
      return;
    }
    const maxGuestsAllowed = selectedUnit?.capacity?.maxGuests || property.capacity?.maxGuests || 10;
    if (guests > maxGuestsAllowed) {
      toast.error(isAr ? `الحد الأقصى ${getGuestLabel(maxGuestsAllowed, 'ar')}` : `Maximum ${maxGuestsAllowed} guests allowed`);
      return;
    }

    // If property has units, require a unit selection
    if (units.length > 0 && !selectedUnitId) {
      toast.error(isAr ? 'يرجى اختيار وحدة' : 'Please select a unit');
      return;
    }

    saveSearchCookies({ checkIn, checkOut, adults, children });

    // Create a 2-min reservation hold — blocks others from booking these dates
    if (isAuthenticated) {
      setHoldLoading(true);
      try {
        const holdRes = await bookingsApi.createHold({
          propertyId: property._id,
          ...(selectedUnitId ? { unitId: selectedUnitId } : {}),
          checkIn,
          checkOut,
          guests: { adults, children, infants: 0 },
        });
        if (holdRes.data?.data?.holdId) {
          localStorage.setItem(`hostn_hold_${property._id}`, holdRes.data.data.holdId);
        }
      } catch (err: unknown) {
        const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
        if (code === 'DATES_UNAVAILABLE') {
          toast.error(isAr
            ? 'هذه التواريخ محجوزة حالياً. يرجى اختيار تواريخ أخرى.'
            : 'These dates are currently taken. Please choose different dates.');
          setHoldLoading(false);
          return; // Don't navigate — dates are held/booked by someone else
        }
        // Other failures (not logged in, network, etc.) — proceed without hold
      } finally {
        setHoldLoading(false);
      }
    }

    // Store selected unit for the booking page
    if (selectedUnitId) {
      localStorage.setItem(`hostn_unit_${property._id}`, selectedUnitId);
    } else {
      localStorage.removeItem(`hostn_unit_${property._id}`);
    }
    router.push(`/booking/${property._id}`);
  };

  // Use unit discount if available, fall back to property discount
  const discountPct = (selectedUnit?.pricing as Record<string, number>)?.discountPercent
    ?? property.pricing?.discountPercent ?? 0;
  const baseNightlyPrice = pricePerNight > 0 ? pricePerNight
    : previewPricePerNight > 0 ? previewPricePerNight
    : (property.pricing?.perNight ?? 0);
  const displayPrice = discountPct > 0
    ? getDiscountedPrice(baseNightlyPrice, discountPct)
    : baseNightlyPrice;
  const nightLabel = getNightLabel(nights, language as 'en' | 'ar');

  return (
    <div className="card p-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Price header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {discountPct > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary-600" dir="ltr">
                <SarSymbol /> {formatPriceNumber(displayPrice)}
              </span>
              <span className="text-base text-gray-400 line-through" dir="ltr">
                <SarSymbol /> {formatPriceNumber(baseNightlyPrice)}
              </span>
              <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary-600" dir="ltr">
                  <SarSymbol /> {formatPriceNumber(previewPricePerNight > 0 && nights === 0 ? previewPricePerNight : pricePerNight)}
                </span>
                <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
              </div>
              {previewPricePerNight > 0 && nights === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'سعر ليلة واحدة (حدد تاريخ المغادرة)' : '1-night rate (select checkout)'}
                </p>
              )}
            </div>
          )}
        </div>
        {(property.ratings?.count ?? 0) > 0 && (
          <StarRating
            rating={property.ratings?.average ?? 0}
            count={property.ratings?.count ?? 0}
            size="sm"
          />
        )}
      </div>

      {/* Total nights summary */}
      {nights > 0 && (
        <div className="text-sm text-gray-500 mb-3">
          <span>{isAr ? `الإجمالي ${nightLabel} ` : `Total ${nightLabel} `}</span>
          <span className="font-semibold text-gray-700" dir="ltr"><SarSymbol /> {formatPriceNumber(subtotal)}</span>
        </div>
      )}

      {/* Unit selector (only shown when property has units and no specific unit was pre-selected) */}
      {units.length > 0 && !initialUnitId && (
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            {isAr ? 'اختر الوحدة' : 'Select Unit'}
          </label>
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
          >
            <option value="">{isAr ? '— اختر وحدة —' : '— Choose a unit —'}</option>
            {units.map((u) => (
              <option key={u._id} value={u._id}>
                {isAr ? (u.nameAr || u.nameEn || u._id) : (u.nameEn || u.nameAr || u._id)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date inputs */}
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-3 transition-colors relative">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <button
            type="button"
            onClick={() => { setSelectingCheckOut(false); setShowCalendar(!showCalendar); }}
            className="p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="block text-xs font-semibold text-gray-500 mb-1">{t('booking.checkIn')}</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className={`text-sm font-medium ${checkIn ? 'text-gray-800' : 'text-gray-400'}`}>
                {checkIn ? (isAr ? new Date(checkIn).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' }) : format(new Date(checkIn), 'MMM d, yyyy')) : t('booking.checkIn')}
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setSelectingCheckOut(true); setShowCalendar(!showCalendar); }}
            className="p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="block text-xs font-semibold text-gray-500 mb-1">{t('booking.checkOut')}</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className={`text-sm font-medium ${checkOut ? 'text-gray-800' : 'text-gray-400'}`}>
                {checkOut ? (isAr ? new Date(checkOut).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' }) : format(new Date(checkOut), 'MMM d, yyyy')) : t('booking.checkOut')}
              </span>
            </div>
          </button>
        </div>
        {showCalendar && (
          <div className="border-t border-gray-200 bg-white">
            <div className="text-center py-2 text-xs font-medium text-primary-600">
              {selectingCheckOut ? (t('booking.checkOut')) : (t('booking.checkIn'))}
            </div>
            <MiniCalendar
              checkIn={checkIn}
              checkOut={checkOut}
              onSelectDate={handleDateSelect}
              locale={language as 'en' | 'ar'}
              unavailableDates={(() => {
                // PR G: split into check-in vs check-out lists. The first day
                // of any existing booking (hotel-style "checkout morning") is
                // blocked as a check-in, but still valid as a CHECK-OUT.
                const propertyLevel = ((property as Property & { unavailableDates?: (string | Date)[] }).unavailableDates || [])
                  .map((d) => typeof d === 'string' ? d : format(new Date(d), 'yyyy-MM-dd'));
                const propBookingStarts = new Set<string>();
                const propertyBookings = (property.bookedDates || []).flatMap((range) => {
                  const dates: string[] = [];
                  const start = new Date(range.start);
                  const end = new Date(range.end);
                  propBookingStarts.add(format(new Date(start), 'yyyy-MM-dd'));
                  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    dates.push(format(new Date(d), 'yyyy-MM-dd'));
                  }
                  return dates;
                });
                const unitBlocked = (selectedUnit?.datePricing || [])
                  .filter((dp) => dp.isBlocked)
                  .map((dp) => new Date(dp.date).toISOString().slice(0, 10));
                // Check-in: every booked/blocked day.
                const checkInList = [
                  ...propertyLevel, ...propertyBookings, ...unitBlocked, ...unitBookedDates,
                ];
                if (!selectingCheckOut) return checkInList;
                // Check-out: remove the first-day-of-booking entries so the
                // guest can check out on the day the next booking starts.
                const allStarts = new Set<string>([...propBookingStarts, ...unitBookingStartDates]);
                return checkInList.filter((d) => !allStarts.has(d));
              })()}
            />
          </div>
        )}
        <div className="border-t border-gray-200 p-3 space-y-3">
          <label className="block text-xs font-semibold text-gray-500">{t('booking.guests')}</label>
          {/* Adults */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">{isAr ? '\u0628\u0627\u0644\u063A\u064A\u0646' : 'Adults'}</div>
              <div className="text-[10px] text-gray-400">{isAr ? '13 \u0633\u0646\u0629 \u0641\u0623\u0643\u062B\u0631' : 'Ages 13+'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-medium">{adults}</span>
              <button type="button" onClick={() => setAdults((a) => Math.min((selectedUnit?.capacity?.maxGuests || property.capacity?.maxGuests || 10) - children, a + 1))} disabled={guests >= (selectedUnit?.capacity?.maxGuests || property.capacity?.maxGuests || 10)}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {/* Children */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">{isAr ? '\u0623\u0637\u0641\u0627\u0644' : 'Children'}</div>
              <div className="text-[10px] text-gray-400">{isAr ? '0\u201312 \u0633\u0646\u0629' : 'Ages 0\u201312'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-medium">{children}</span>
              <button type="button" onClick={() => setChildren((c) => Math.min((selectedUnit?.capacity?.maxGuests || property.capacity?.maxGuests || 10) - adults, c + 1))} disabled={guests >= (selectedUnit?.capacity?.maxGuests || property.capacity?.maxGuests || 10)}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked dates warning */}
      {hasBlockedDates && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-3">
          {isAr ? 'بعض التواريخ المحددة غير متاحة. يرجى اختيار تواريخ أخرى.' : 'Some selected dates are unavailable. Please choose different dates.'}
        </div>
      )}

      {/* Min nights warning */}
      {property.rules?.minNights > 1 && nights > 0 && nights < property.rules.minNights && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 text-center font-medium">
          {isAr
            ? `الحد الأدنى للإقامة ${getNightLabel(property.rules.minNights, 'ar')}`
            : `Minimum stay is ${getNightLabel(property.rules.minNights, 'en')}`}
        </p>
      )}

      <Button onClick={handleBookNow} size="lg" className="w-full mb-4" disabled={holdLoading || hasBlockedDates}>
        {holdLoading
          ? (isAr ? 'جاري التحقق...' : 'Checking...')
          : checkIn && checkOut ? `${t('booking.bookFor')} ${nightLabel}` : t('booking.checkAvailability')}
      </Button>

      <p className="text-xs text-center text-gray-500 mb-5">{t('booking.notChargedYet')}</p>

      {/* Price breakdown.
          PR H: order is price → discounts → cleaning → service → vat → total
          (user feedback — discounts belong right under the nightly price). */}
      {nights > 0 && !hasBlockedDates && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(pricePerNight)} &times; {nightLabel}</span>
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(subtotal)}</span>
          </div>
          {/* Discounts — one line per contributing type when stacked, else
              one aggregate line for the legacy property-only branch. */}
          {discountBreakdown.length > 1 ? (
            discountBreakdown.map((d) => (
              <div key={d.type} className="flex justify-between text-green-600">
                <span>{(isAr ? DISCOUNT_LABELS_AR : DISCOUNT_LABELS_EN)[d.type]} {d.percent}%</span>
                <span dir="ltr"><SarSymbol /> -{formatPriceNumber(d.amount)}</span>
              </div>
            ))
          ) : discount > 0 ? (
            <div className="flex justify-between text-green-600">
              <span>
                {discountBreakdown[0]
                  ? `${(isAr ? DISCOUNT_LABELS_AR : DISCOUNT_LABELS_EN)[discountBreakdown[0].type]} ${discountBreakdown[0].percent}%`
                  : discountLabel
                    ? `${discountLabel} ${appliedDiscountPct}%`
                    : t('booking.discount')}
              </span>
              <span dir="ltr"><SarSymbol /> -{formatPriceNumber(discount)}</span>
            </div>
          ) : null}
          {cleaningFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('booking.cleaningFee')}</span>
              <span dir="ltr"><SarSymbol /> {formatPriceNumber(cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{t('booking.serviceFee')}</span>
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(serviceFee)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('booking.vat')}</span>
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200">
            <span>{t('booking.total')}</span>
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(total)}</span>
          </div>
          {/* BNPL installment preview */}
          <BnplWidget total={total} />
        </div>
      )}

      {/* BNPL widget when no dates selected — show based on per-night price */}
      {nights === 0 && (property.pricing?.perNight ?? 0) > 0 && (
        <BnplWidget total={property.pricing?.perNight ?? 0} />
      )}
    </div>
  );
}
