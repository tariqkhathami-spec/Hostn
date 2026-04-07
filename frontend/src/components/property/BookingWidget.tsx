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
import { bookingsApi } from '@/lib/api';

interface BookingWidgetProps {
  property: Property;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
}

export default function BookingWidget({ property, initialCheckIn = '', initialCheckOut = '', initialAdults = 0, initialChildren = 0 }: BookingWidgetProps) {
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
  // Always use original perNight; discount is shown as a separate line item
  const pricePerNight = property.pricing.perNight;

  const subtotal = nights * pricePerNight;
  const cleaningFee = property.pricing.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const discount = property.pricing.discountPercent > 0
    ? Math.round(subtotal * (property.pricing.discountPercent / 100))
    : 0;
  // Saudi Arabia 15% VAT — applied on taxable amount (after discount)
  const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
  const vat = Math.round(taxableAmount * 0.15);
  const total = taxableAmount + vat;

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
    if (guests > property.capacity.maxGuests) {
      toast.error(isAr ? `الحد الأقصى ${getGuestLabel(property.capacity.maxGuests, 'ar')}` : `Maximum ${property.capacity.maxGuests} guests allowed`);
      return;
    }

    saveSearchCookies({ checkIn, checkOut, adults, children });

    // Create a 2-min reservation hold — blocks others from booking these dates
    if (isAuthenticated) {
      setHoldLoading(true);
      try {
        const holdRes = await bookingsApi.createHold({
          propertyId: property._id,
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

    router.push(`/booking/${property._id}`);
  };

  const displayPrice = property.pricing.discountPercent > 0
    ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
    : property.pricing.perNight;
  const nightLabel = getNightLabel(nights, language as 'en' | 'ar');

  return (
    <div className="card p-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Price header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {property.pricing.discountPercent > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary-600" dir="ltr">
                <SarSymbol /> {formatPriceNumber(displayPrice)}
              </span>
              <span className="text-base text-gray-400 line-through" dir="ltr">
                <SarSymbol /> {formatPriceNumber(property.pricing.perNight)}
              </span>
              <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary-600" dir="ltr">
                <SarSymbol /> {formatPriceNumber(pricePerNight)}
              </span>
              <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
            </div>
          )}
        </div>
        {property.ratings.count > 0 && (
          <StarRating
            rating={property.ratings.average}
            count={property.ratings.count}
            size="sm"
          />
        )}
      </div>

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
              unavailableDates={[
                ...((property as Property & { unavailableDates?: (string | Date)[] }).unavailableDates || []).map((d) => typeof d === 'string' ? d : format(new Date(d), 'yyyy-MM-dd')),
                ...(property.bookedDates || []).flatMap((range) => {
                  const dates: string[] = [];
                  const start = new Date(range.start);
                  const end = new Date(range.end);
                  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    dates.push(format(new Date(d), 'yyyy-MM-dd'));
                  }
                  return dates;
                }),
              ]}
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
              <button type="button" onClick={() => setAdults((a) => Math.min(property.capacity.maxGuests - children, a + 1))} disabled={guests >= property.capacity.maxGuests}
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
              <button type="button" onClick={() => setChildren((c) => Math.min(property.capacity.maxGuests - adults, c + 1))} disabled={guests >= property.capacity.maxGuests}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Min nights warning */}
      {property.rules?.minNights > 1 && nights > 0 && nights < property.rules.minNights && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 text-center font-medium">
          {isAr
            ? `الحد الأدنى للإقامة ${getNightLabel(property.rules.minNights, 'ar')}`
            : `Minimum stay is ${getNightLabel(property.rules.minNights, 'en')}`}
        </p>
      )}

      <Button onClick={handleBookNow} size="lg" className="w-full mb-4" disabled={holdLoading}>
        {holdLoading
          ? (isAr ? 'جاري التحقق...' : 'Checking...')
          : checkIn && checkOut ? `${t('booking.bookFor')} ${nightLabel}` : t('booking.checkAvailability')}
      </Button>

      <p className="text-xs text-center text-gray-500 mb-5">{t('booking.notChargedYet')}</p>

      {/* Price breakdown */}
      {nights > 0 && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(pricePerNight)} &times; {nightLabel}</span>
            <span dir="ltr"><SarSymbol /> {formatPriceNumber(subtotal)}</span>
          </div>
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
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('booking.discount')} ({property.pricing.discountPercent}%)</span>
              <span dir="ltr"><SarSymbol /> -{formatPriceNumber(discount)}</span>
            </div>
          )}
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
      {nights === 0 && property.pricing.perNight > 0 && property.pricing.perNight <= 5000 && (
        <BnplWidget total={property.pricing.perNight} />
      )}
    </div>
  );
}
