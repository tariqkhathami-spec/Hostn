'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';
import { formatPrice, formatPriceNumber, calculateNights, getDiscountedPrice } from '@/lib/utils';
import { Calendar, Users, Minus, Plus } from 'lucide-react';
import MiniCalendar from '@/components/ui/MiniCalendar';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';
import BnplWidget from '@/components/payment/BnplWidget';
import SarSymbol from '@/components/ui/SarSymbol';

interface BookingWidgetProps {
  property: Property;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

export default function BookingWidget({ property, initialCheckIn = '', initialCheckOut = '' }: BookingWidgetProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

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

  const handleBookNow = () => {
    if (!checkIn || !checkOut) {
      toast.error(t('booking.selectDates'));
      return;
    }
    if (nights <= 0) {
      toast.error(t('booking.checkOutAfter'));
      return;
    }
    if (guests > property.capacity.maxGuests) {
      toast.error(t('booking.maxGuests').replace('{count}', String(property.capacity.maxGuests)));
      return;
    }

    const params = new URLSearchParams({ checkIn, checkOut, guests: guests.toString() });
    router.push(`/booking/${property._id}?${params.toString()}`);
  };

  const displayPrice = property.pricing.discountPercent > 0
    ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
    : property.pricing.perNight;
  const nightLabel = nights !== 1 ? t('booking.nights') : t('booking.nightSingle');

  return (
    <div className="card p-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Price header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {property.pricing.discountPercent > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary-600">
                <SarSymbol /> {formatPriceNumber(displayPrice)}
              </span>
              <span className="text-base text-gray-400 line-through">
                {formatPriceNumber(property.pricing.perNight)}
              </span>
              <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary-600">
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
                {checkIn ? format(new Date(checkIn), 'MMM d, yyyy') : t('booking.checkIn')}
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
                {checkOut ? format(new Date(checkOut), 'MMM d, yyyy') : t('booking.checkOut')}
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
              unavailableDates={((property as Property & { unavailableDates?: (string | Date)[] }).unavailableDates || []).map((d) => typeof d === 'string' ? d : format(new Date(d), 'yyyy-MM-dd'))}
            />
          </div>
        )}
        <div className="border-t border-gray-200 p-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('booking.guests')}</label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-800">
                {guests} {guests > 1 ? t('booking.guestsCount') : t('booking.guestCount')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-medium">{guests}</span>
              <button type="button" onClick={() => setGuests((g) => Math.min(property.capacity.maxGuests, g + 1))} disabled={guests >= property.capacity.maxGuests}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleBookNow} size="lg" className="w-full mb-4">
        {checkIn && checkOut ? `${t('booking.bookFor')} ${nights} ${nightLabel}` : t('booking.checkAvailability')}
      </Button>

      <p className="text-xs text-center text-gray-500 mb-5">{t('booking.notChargedYet')}</p>

      {/* Price breakdown */}
      {nights > 0 && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span><SarSymbol /> {formatPriceNumber(pricePerNight)} &times; {nights} {nightLabel}</span>
            <span><SarSymbol /> {formatPriceNumber(subtotal)}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('booking.cleaningFee')}</span>
              <span><SarSymbol /> {formatPriceNumber(cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{t('booking.serviceFee')}</span>
            <span><SarSymbol /> {formatPriceNumber(serviceFee)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('booking.discount')} ({property.pricing.discountPercent}%)</span>
              <span><SarSymbol /> -{formatPriceNumber(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{t('booking.vat')}</span>
            <span><SarSymbol /> {formatPriceNumber(vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200">
            <span>{t('booking.total')}</span>
            <span><SarSymbol /> {formatPriceNumber(total)}</span>
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
