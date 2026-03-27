'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';
import { formatPrice, calculateNights, getDiscountedPrice } from '@/lib/utils';
import { Calendar, Users, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, isSameDay, isBefore,
  isAfter, isSameMonth, startOfDay,
} from 'date-fns';

interface BookingWidgetProps {
  property: Property;
}

function MiniCalendar({
  checkIn,
  checkOut,
  onSelectDate,
  unavailableDates = [],
}: {
  checkIn: string;
  checkOut: string;
  onSelectDate: (date: string) => void;
  unavailableDates?: string[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const rows: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [currentMonth]);

  const checkInDate = checkIn ? startOfDay(new Date(checkIn)) : null;
  const checkOutDate = checkOut ? startOfDay(new Date(checkOut)) : null;

  const isInRange = (day: Date) => {
    if (!checkInDate || !checkOutDate) return false;
    return isAfter(day, checkInDate) && isBefore(day, checkOutDate);
  };

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isPast = isBefore(day, today);
          const isUnavailable = unavailableSet.has(dateStr);
          const disabled = isPast || isUnavailable || !isSameMonth(day, currentMonth);
          const isCheckIn = checkInDate && isSameDay(day, checkInDate);
          const isCheckOut = checkOutDate && isSameDay(day, checkOutDate);
          const inRange = isInRange(day);

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              className={`
                h-8 text-xs rounded-md transition-colors
                ${disabled ? 'text-gray-300 cursor-default' : 'hover:bg-primary-100 cursor-pointer'}
                ${isCheckIn || isCheckOut ? 'bg-primary-600 text-white font-bold hover:bg-primary-700' : ''}
                ${inRange ? 'bg-primary-100 text-primary-800' : ''}
                ${!disabled && !isCheckIn && !isCheckOut && !inRange ? 'text-gray-700' : ''}
              `}
            >
              {isSameMonth(day, currentMonth) ? format(day, 'd') : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingWidget({ property }: BookingWidgetProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
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
  const pricePerNight = property.pricing.discountPercent > 0
    ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
    : property.pricing.perNight;

  const subtotal = nights * pricePerNight;
  const cleaningFee = property.pricing.cleaningFee || 0;
  const serviceFee = Math.round((subtotal + cleaningFee) * 0.1);
  const total = subtotal + cleaningFee + serviceFee;

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

  const nightLabel = nights !== 1 ? t('booking.nights') : t('booking.nightSingle');

  return (
    <div className="card p-6 sticky top-24">
      {/* Price header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {property.pricing.discountPercent > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(pricePerNight)}
              </span>
              <span className="text-base text-gray-400 line-through">
                {formatPrice(property.pricing.perNight)}
              </span>
              <span className="text-sm text-gray-500">{t('booking.perNight')}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(pricePerNight)}
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
          <div className="relative">
            <Users className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="pl-5 w-full text-sm font-medium text-gray-800 focus:outline-none appearance-none"
            >
              {[...Array(property.capacity.maxGuests)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i > 0 ? t('booking.guestsCount') : t('booking.guestCount')}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
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
            <span>{formatPrice(pricePerNight)} × {nights} {nightLabel}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('booking.cleaningFee')}</span>
              <span>{formatPrice(cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{t('booking.serviceFee')}</span>
            <span>{formatPrice(serviceFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200">
            <span>{t('booking.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
