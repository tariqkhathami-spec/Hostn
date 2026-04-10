'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, hostApi, unitsApi } from '@/lib/api';
import { Calendar, Loader2, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Types                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface Property {
  _id: string;
  title: string;
}

interface Unit {
  _id: string;
  nameEn: string;
  nameAr: string;
}

interface BookingEntry {
  _id: string;
  guest?: { name: string };
  checkIn: string;
  checkOut: string;
  status: string;
  total: number;
  unit?: { _id: string; nameEn: string; nameAr: string } | null;
}

interface BlockedRange {
  start: string;
  end: string;
}

interface DayInfo {
  status: 'confirmed' | 'pending';
  guest: string;
  total: number;
  bookingId: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Translations                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const t: Record<string, Record<string, string>> = {
  title: { en: 'Calendar', ar: '\u0627\u0644\u062a\u0642\u0648\u064a\u0645' },
  selectProperty: { en: 'Select a property', ar: '\u0627\u062e\u062a\u0631 \u0639\u0642\u0627\u0631\u0627\u064b' },
  selectUnit: { en: 'Select a unit', ar: '\u0627\u062e\u062a\u0631 \u0648\u062d\u062f\u0629' },
  allUnits: { en: 'All units', ar: '\u062c\u0645\u064a\u0639 \u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  today: { en: 'Today', ar: '\u0627\u0644\u064a\u0648\u0645' },
  block: { en: 'Block dates', ar: '\u062d\u0638\u0631 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e' },
  unblock: { en: 'Unblock dates', ar: '\u0625\u0644\u063a\u0627\u0621 \u062d\u0638\u0631 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e' },
  bookings: { en: 'Bookings this month', ar: '\u062d\u062c\u0648\u0632\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631' },
  noBookings: { en: 'No bookings this month', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631' },
  guest: { en: 'Guest', ar: '\u0627\u0644\u0636\u064a\u0641' },
  checkIn: { en: 'Check-in', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' },
  status: { en: 'Status', ar: '\u0627\u0644\u062d\u0627\u0644\u0629' },
  amount: { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
  pending: { en: 'Pending', ar: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' },
  confirmed: { en: 'Confirmed', ar: '\u0645\u0624\u0643\u062f' },
  blocked: { en: 'Blocked', ar: '\u0645\u062d\u0638\u0648\u0631' },
  available: { en: 'Available', ar: '\u0645\u062a\u0627\u062d' },
  selectRange: { en: 'Click a start date, then an end date', ar: '\u0627\u0646\u0642\u0631 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629 \u062b\u0645 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629' },
  datesBlocked: { en: 'Dates blocked successfully', ar: '\u062a\u0645 \u062d\u0638\u0631 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0628\u0646\u062c\u0627\u062d' },
  datesUnblocked: { en: 'Dates unblocked successfully', ar: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u062d\u0638\u0631 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0628\u0646\u062c\u0627\u062d' },
  error: { en: 'Something went wrong', ar: '\u062d\u062f\u062b \u062e\u0637\u0623 \u0645\u0627' },
  conflictError: { en: 'Some dates have existing bookings', ar: '\u0628\u0639\u0636 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0628\u0647\u0627 \u062d\u062c\u0648\u0632\u0627\u062a \u0642\u0627\u0626\u0645\u0629' },
  sun: { en: 'Su', ar: '\u0623\u062d' },
  mon: { en: 'Mo', ar: '\u0627\u062b' },
  tue: { en: 'Tu', ar: '\u062b\u0644' },
  wed: { en: 'We', ar: '\u0623\u0631' },
  thu: { en: 'Th', ar: '\u062e\u0645' },
  fri: { en: 'Fr', ar: '\u062c\u0645' },
  sat: { en: 'Sa', ar: '\u0633\u0628' },
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Format a Date as 'YYYY-MM-DD' */
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get all days to render in the calendar grid (including padding from prev/next month).
 *  Week starts on Saturday (index 6 in JS). */
function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // JS: 0=Sun,1=Mon,...,6=Sat  —  We want Sat first, so offset:
  // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const saturdayOffset = (firstDay.getDay() + 1) % 7; // days to pad before month start

  const days: Date[] = [];

  // Padding from previous month
  for (let i = saturdayOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Padding from next month to complete the grid (always fill to multiple of 7)
  while (days.length % 7 !== 0) {
    const next = days.length - saturdayOffset - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

/** Build a Set of 'YYYY-MM-DD' strings from a start to end date (inclusive) */
function dateRangeToSet(start: Date, end: Date): Set<string> {
  const set = new Set<string>();
  const current = new Date(start);
  while (current <= end) {
    set.add(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return set;
}

/* Month names */
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['\u064a\u0646\u0627\u064a\u0631', '\u0641\u0628\u0631\u0627\u064a\u0631', '\u0645\u0627\u0631\u0633', '\u0623\u0628\u0631\u064a\u0644', '\u0645\u0627\u064a\u0648', '\u064a\u0648\u0646\u064a\u0648', '\u064a\u0648\u0644\u064a\u0648', '\u0623\u063a\u0633\u0637\u0633', '\u0633\u0628\u062a\u0645\u0628\u0631', '\u0623\u0643\u062a\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062f\u064a\u0633\u0645\u0628\u0631'];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Component                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function HostCalendarPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0627\u0644\u062a\u0642\u0648\u064a\u0645' : 'Calendar');

  /* ── state ── */
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [calendarData, setCalendarData] = useState<{ bookings: BookingEntry[]; blockedDates: BlockedRange[] }>({ bookings: [], blockedDates: [] });
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  /* ── Day headers (Sat first) ── */
  const dayHeaders = [t.sat, t.sun, t.mon, t.tue, t.wed, t.thu, t.fri];

  /* ── derived data ── */
  const todayKey = formatDateKey(new Date());

  const bookingMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    for (const b of calendarData.bookings) {
      const start = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      const current = new Date(start);
      while (current < end) {
        map.set(formatDateKey(current), {
          status: b.status as 'confirmed' | 'pending',
          guest: b.guest?.name || '-',
          total: b.total,
          bookingId: b._id,
        });
        current.setDate(current.getDate() + 1);
      }
    }
    return map;
  }, [calendarData.bookings]);

  const blockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const range of calendarData.blockedDates) {
      const start = new Date(range.start);
      const end = new Date(range.end);
      const current = new Date(start);
      while (current <= end) {
        set.add(formatDateKey(current));
        current.setDate(current.getDate() + 1);
      }
    }
    return set;
  }, [calendarData.blockedDates]);

  const selectedSet = useMemo(() => {
    if (!selectionStart) return new Set<string>();
    if (!selectionEnd) return new Set([selectionStart]);
    const a = new Date(selectionStart);
    const b = new Date(selectionEnd);
    return dateRangeToSet(a <= b ? a : b, a <= b ? b : a);
  }, [selectionStart, selectionEnd]);

  const gridDays = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  /* ── Load properties on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await propertiesApi.getMyProperties();
        const data: Property[] = res.data.data || res.data || [];
        setProperties(data);
        if (data.length > 0) setSelectedPropertyId(data[0]._id);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Load units when property changes ── */
  useEffect(() => {
    if (!selectedPropertyId) { setUnits([]); return; }
    (async () => {
      try {
        const res = await unitsApi.getForProperty(selectedPropertyId);
        const data: Unit[] = res.data.data || res.data || [];
        setUnits(data);
        setSelectedUnitId('');
      } catch {
        setUnits([]);
      }
    })();
  }, [selectedPropertyId]);

  /* ── Fetch calendar data when property/unit/month changes ── */
  const fetchCalendar = useCallback(async () => {
    if (!selectedPropertyId) return;
    setCalendarLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const params: Record<string, string> = { startDate, endDate };
      if (selectedUnitId) params.unitId = selectedUnitId;
      const res = await hostApi.getCalendar(selectedPropertyId, params);
      const d = res.data.data || res.data || {};
      setCalendarData({
        bookings: d.bookings || [],
        blockedDates: d.blockedDates || [],
      });
    } catch {
      // silent
    } finally {
      setCalendarLoading(false);
    }
  }, [selectedPropertyId, selectedUnitId, currentYear, currentMonth]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  /* ── Navigation ── */
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    clearSelection();
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    clearSelection();
  };
  const goToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    clearSelection();
  };

  /* ── Selection ── */
  const clearSelection = () => { setSelectionStart(null); setSelectionEnd(null); };

  const handleDayClick = (dateKey: string) => {
    // Don't allow selecting past dates
    if (dateKey < todayKey) return;
    // Don't allow selecting booked dates
    if (bookingMap.has(dateKey)) return;

    if (!selectionStart || selectionEnd) {
      // Start a new selection
      setSelectionStart(dateKey);
      setSelectionEnd(null);
    } else {
      // Complete the selection
      if (dateKey === selectionStart) {
        clearSelection();
        return;
      }
      // Ensure start < end
      if (dateKey < selectionStart) {
        setSelectionEnd(selectionStart);
        setSelectionStart(dateKey);
      } else {
        setSelectionEnd(dateKey);
      }
    }
  };

  /* ── Block / Unblock ── */
  const handleBlockAction = async (action: 'block' | 'unblock') => {
    if (!selectionStart || !selectedPropertyId) return;
    const startDate = selectionStart;
    const endDate = selectionEnd || selectionStart;

    try {
      await hostApi.blockDates(selectedPropertyId, {
        startDate,
        endDate,
        action,
        unitId: selectedUnitId || undefined,
      });
      toast.success(action === 'block' ? t.datesBlocked[lang] : t.datesUnblocked[lang]);
      clearSelection();
      fetchCalendar();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 409) {
        toast.error(t.conflictError[lang]);
      } else {
        toast.error(t.error[lang]);
      }
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  /* ── Month bookings for the list below ── */
  const monthBookings = calendarData.bookings.filter((b) => {
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    return ci <= monthEnd && co >= monthStart;
  });

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render                                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div>
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* ── Selectors Row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Property selector */}
        <select
          value={selectedPropertyId}
          onChange={(e) => { setSelectedPropertyId(e.target.value); clearSelection(); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm min-w-[220px]"
        >
          <option value="">{t.selectProperty[lang]}</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </select>

        {/* Unit selector (only when units exist) */}
        {units.length > 0 && (
          <select
            value={selectedUnitId}
            onChange={(e) => { setSelectedUnitId(e.target.value); clearSelection(); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm min-w-[180px]"
          >
            <option value="">{t.allUnits[lang]}</option>
            {units.map((u) => (
              <option key={u._id} value={u._id}>
                {isAr ? (u.nameAr || u.nameEn) : (u.nameEn || u.nameAr)}
              </option>
            ))}
          </select>
        )}

        {/* Month / Year nav */}
        <div className="flex items-center gap-2 ms-auto">
          <button onClick={goToday} className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
            {t.today[lang]}
          </button>
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
            {isAr ? MONTHS_AR[currentMonth] : MONTHS_EN[currentMonth]} {currentYear}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 relative">
        {/* Loading overlay */}
        {calendarLoading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        )}

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {dayHeaders.map((day) => (
            <div key={day.en} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
              {day[lang]}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {gridDays.map((date, idx) => {
            const key = formatDateKey(date);
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isPast = key < todayKey;
            const isToday = key === todayKey;
            const isBlocked = blockedSet.has(key);
            const booking = bookingMap.get(key);
            const isSelected = selectedSet.has(key);
            const isSelectable = isCurrentMonth && !isPast && !booking;

            // Build cell classes
            let cellBg = 'bg-white';
            let cellText = 'text-gray-900';
            let cellBorder = 'border-transparent';
            let extraClasses = '';

            if (!isCurrentMonth) {
              cellBg = 'bg-gray-50';
              cellText = 'text-gray-300';
            } else if (isSelected) {
              cellBg = 'bg-primary-100';
              cellBorder = 'border-primary-300';
            } else if (booking?.status === 'confirmed') {
              cellBg = 'bg-green-100';
              cellBorder = 'border-green-300';
            } else if (booking?.status === 'pending') {
              cellBg = 'bg-yellow-100';
              cellBorder = 'border-yellow-300';
            } else if (isBlocked) {
              cellBg = 'bg-gray-200';
              cellText = 'text-gray-400';
            } else if (isPast && isCurrentMonth) {
              cellText = 'text-gray-300';
            }

            if (isSelectable && !isSelected && !isBlocked) {
              extraClasses = 'hover:bg-gray-50 cursor-pointer';
            } else if (isBlocked && isCurrentMonth && !isPast) {
              extraClasses = 'cursor-pointer'; // allow clicking blocked dates to unblock
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!isCurrentMonth) return;
                  if (isPast) return;
                  if (booking) return;
                  handleDayClick(key);
                }}
                className={`
                  relative p-2 min-h-[64px] border ${cellBorder} ${cellBg} ${cellText} ${extraClasses}
                  transition-colors text-sm
                  ${isToday ? 'ring-2 ring-primary-500 ring-inset z-[1]' : ''}
                `}
              >
                <span className="font-medium">{date.getDate()}</span>

                {/* Booking dot indicator */}
                {booking && isCurrentMonth && (
                  <span
                    className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                )}

                {/* Blocked diagonal stripes */}
                {isBlocked && isCurrentMonth && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #9ca3af 4px, #9ca3af 5px)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-green-100 border-green-300 inline-block" />
          {t.confirmed[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-yellow-100 border-yellow-300 inline-block" />
          {t.pending[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-gray-200 border-gray-300 inline-block relative overflow-hidden">
            <span className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #9ca3af 2px, #9ca3af 3px)' }} />
          </span>
          {t.blocked[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-white border-gray-200 inline-block" />
          {t.available[lang]}
        </span>
      </div>

      {/* ── Selection Action Bar ── */}
      {selectionStart && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-primary-700">
            {selectionEnd ? (
              <span>
                {isAr ? 'من' : 'From'} <strong>{selectionStart}</strong> {isAr ? 'إلى' : 'to'} <strong>{selectionEnd}</strong>
              </span>
            ) : (
              <span>{t.selectRange[lang]}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBlockAction('block')}
              disabled={!selectionStart}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {t.block[lang]}
            </button>
            <button
              onClick={() => handleBlockAction('unblock')}
              disabled={!selectionStart}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              {t.unblock[lang]}
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ── Bookings List ── */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          {t.bookings[lang]}
        </h2>

        {monthBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            {t.noBookings[lang]}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-start p-3 font-medium text-gray-600">{t.guest[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600">{t.checkIn[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600">{t.checkOut[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600">{t.status[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600">{t.amount[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthBookings.map((b) => (
                    <tr key={b._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-900">{b.guest?.name || '-'}</td>
                      <td className="p-3 text-gray-600">
                        {new Date(b.checkIn).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(b.checkOut).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t[b.status]?.[lang] || b.status}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-gray-900">
                        <span dir="ltr"><SarSymbol /> {b.total?.toLocaleString('en')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
