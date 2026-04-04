'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, isSameDay, isBefore,
  isAfter, isSameMonth, startOfDay,
} from 'date-fns';

export interface MiniCalendarProps {
  checkIn: string;
  checkOut: string;
  onSelectDate: (date: string) => void;
  onConfirm?: () => void;
  unavailableDates?: string[];
  locale?: 'en' | 'ar';
  className?: string;
  dual?: boolean;
}

const DAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES_AR = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];

const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function formatMonthYear(date: Date, locale: string) {
  if (locale === 'ar') {
    return `${MONTH_NAMES_AR[date.getMonth()]} ${date.getFullYear()}`;
  }
  return format(date, 'MMMM yyyy');
}

function buildWeeks(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
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
}

function MonthGrid({
  month,
  checkInDate,
  checkOutDate,
  isInRange,
  today,
  unavailableSet,
  onSelectDate,
  dayNames,
  locale,
}: {
  month: Date;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  isInRange: (day: Date) => boolean;
  today: Date;
  unavailableSet: Set<string>;
  onSelectDate: (date: string) => void;
  dayNames: string[];
  locale: string;
}) {
  const weeks = useMemo(() => buildWeeks(month), [month]);

  return (
    <div>
      <div className="text-center text-sm font-semibold text-gray-800 mb-2">
        {formatMonthYear(month, locale)}
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
          const disabled = isPast || isUnavailable || !isSameMonth(day, month);
          const isCheckIn = checkInDate && isSameDay(day, checkInDate);
          const isCheckOut = checkOutDate && isSameDay(day, checkOutDate);
          const inRange = isInRange(day);

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              aria-label={format(day, 'MMMM d, yyyy')}
              aria-disabled={disabled}
              className={`
                h-8 text-xs rounded-md transition-colors
                ${disabled ? 'text-gray-300 cursor-default' : 'hover:bg-primary-100 cursor-pointer'}
                ${isCheckIn || isCheckOut ? 'bg-primary-600 text-white font-bold hover:bg-primary-700' : ''}
                ${inRange ? 'bg-primary-100 text-primary-800' : ''}
                ${!disabled && !isCheckIn && !isCheckOut && !inRange ? 'text-gray-700' : ''}
              `}
            >
              {isSameMonth(day, month) ? format(day, 'd') : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MiniCalendar({
  checkIn,
  checkOut,
  onSelectDate,
  onConfirm,
  unavailableDates = [],
  locale = 'en',
  className = '',
  dual = false,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (checkIn) {
      const d = new Date(checkIn);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const today = startOfDay(new Date());
  const nextMonth = addMonths(currentMonth, 1);

  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const checkInDate = checkIn ? startOfDay(new Date(checkIn)) : null;
  const checkOutDate = checkOut ? startOfDay(new Date(checkOut)) : null;

  const isInRange = (day: Date) => {
    if (!checkInDate || !checkOutDate) return false;
    return isAfter(day, checkInDate) && isBefore(day, checkOutDate);
  };

  const dayNames = locale === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;

  const sharedProps = {
    checkInDate,
    checkOutDate,
    isInRange,
    today,
    unavailableSet,
    onSelectDate,
    dayNames,
    locale,
  };

  return (
    <div className={`p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={locale === 'ar' ? 'الشهر السابق' : 'Previous month'}
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        {!dual && (
          <span className="text-sm font-semibold text-gray-800">
            {formatMonthYear(currentMonth, locale)}
          </span>
        )}
        {dual && <span className="text-sm font-semibold text-gray-800" />}
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={locale === 'ar' ? 'الشهر التالي' : 'Next month'}
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {dual ? (
        <div className="grid grid-cols-2 gap-4">
          <MonthGrid month={currentMonth} {...sharedProps} />
          <MonthGrid month={nextMonth} {...sharedProps} />
        </div>
      ) : (
        <MonthGrid month={currentMonth} {...sharedProps} />
      )}

      {onConfirm && checkIn && checkOut && (
        <div className="px-1 pt-2 pb-1 border-t border-gray-100 mt-2 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            {locale === 'ar' ? '\u062A\u0623\u0643\u064A\u062F' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
