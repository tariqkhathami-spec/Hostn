'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, unitsApi, bookingsApi } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Types                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface PropertyData {
  _id: string;
  title: string;
  titleAr?: string;
}

interface UnitData {
  _id: string;
  nameEn?: string;
  nameAr?: string;
  datePricing?: { date: string; price?: number; isBlocked?: boolean }[];
}

interface BookedDateEntry {
  checkIn: string;
  checkOut: string;
  status: string;
}

interface PropertyUnits {
  units: UnitData[];
  loaded: boolean;
}

interface UnitBookings {
  entries: BookedDateEntry[];
  loaded: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Translations                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const t: Record<string, Record<string, string>> = {
  title:        { en: 'Calendar',          ar: 'التقويم' },
  confirmed:    { en: 'Confirmed',         ar: 'مؤكد' },
  pending:      { en: 'Pending',           ar: 'قيد الانتظار' },
  hostReserved: { en: 'Host Reserved',     ar: 'محجوز من المضيف' },
  available:    { en: 'Available',         ar: 'متاح' },
  noUnits:      { en: 'No units',          ar: 'لا توجد وحدات' },
  noProperties: { en: 'No properties yet', ar: 'لا توجد عقارات بعد' },
  loading:      { en: 'Loading...',        ar: 'جاري التحميل...' },
  sun: { en: 'Su', ar: 'أح' },
  mon: { en: 'Mo', ar: 'اث' },
  tue: { en: 'Tu', ar: 'ثل' },
  wed: { en: 'We', ar: 'أر' },
  thu: { en: 'Th', ar: 'خم' },
  fri: { en: 'Fr', ar: 'جم' },
  sat: { en: 'Sa', ar: 'سب' },
  defaultDay:  { en: 'Default',      ar: 'افتراضي' },
  overrideDay: { en: 'Custom price', ar: 'سعر مخصص' },
  upcoming:    { en: 'Upcoming',     ar: 'قادم' },
  completed:   { en: 'Completed',    ar: 'مكتمل' },
  weekend:     { en: 'Weekend',      ar: 'نهاية الأسبوع' },
  today:       { en: 'Today',        ar: 'اليوم' },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get calendar grid days for a month. Week starts on Sunday. */
function getGridDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun

  const days: Date[] = [];

  // Padding from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Padding to fill last row
  while (days.length % 7 !== 0) {
    const next = days.length - startOffset - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const DAY_HEADERS = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Component                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function HostCalendarPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'التقويم' : 'Calendar');

  /* ── State ── */
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Cache: propertyId -> { units, loaded }
  const [propertyUnitsMap, setPropertyUnitsMap] = useState<Record<string, PropertyUnits>>({});
  // Cache: unitId -> { entries, loaded }
  const [unitBookingsMap, setUnitBookingsMap] = useState<Record<string, UnitBookings>>({});

  // Track whether initial data fetch has been done
  const fetchedRef = useRef(false);

  /* ── Grid days for current month (shared across all calendars) ── */
  const gridDays = useMemo(() => getGridDays(currentYear, currentMonth), [currentYear, currentMonth]);

  /* ── Load properties on mount ── */
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await propertiesApi.getMyProperties();
        const data: PropertyData[] = res.data.data || res.data || [];
        setProperties(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Load units for all properties (once properties are loaded) ── */
  useEffect(() => {
    if (properties.length === 0) return;

    const toFetch = properties.filter((p) => !propertyUnitsMap[p._id]);
    if (toFetch.length === 0) return;

    (async () => {
      const newMap: Record<string, PropertyUnits> = {};

      await Promise.all(
        toFetch.map(async (p) => {
          try {
            const res = await unitsApi.getManage(p._id);
            const units: UnitData[] = res.data.data || res.data || [];
            newMap[p._id] = { units, loaded: true };
          } catch {
            newMap[p._id] = { units: [], loaded: true };
          }
        })
      );

      setPropertyUnitsMap((prev) => ({ ...prev, ...newMap }));
    })();
  }, [properties, propertyUnitsMap]);

  /* ── Load bookings for all units (once units are loaded) ── */
  useEffect(() => {
    const allUnits: UnitData[] = [];
    for (const p of properties) {
      const pu = propertyUnitsMap[p._id];
      if (pu?.loaded) {
        allUnits.push(...pu.units);
      }
    }

    const toFetch = allUnits.filter((u) => !unitBookingsMap[u._id]);
    if (toFetch.length === 0) return;

    (async () => {
      const newMap: Record<string, UnitBookings> = {};

      await Promise.all(
        toFetch.map(async (u) => {
          try {
            const res = await bookingsApi.getUnitBookedDates(u._id);
            const entries: BookedDateEntry[] = res.data.data || res.data || [];
            newMap[u._id] = { entries, loaded: true };
          } catch {
            newMap[u._id] = { entries: [], loaded: true };
          }
        })
      );

      setUnitBookingsMap((prev) => ({ ...prev, ...newMap }));
    })();
  }, [properties, propertyUnitsMap, unitBookingsMap]);

  /* ── Build per-unit day status maps ── */
  const getUnitDayStatus = useCallback(
    (unit: UnitData): Map<string, 'confirmed' | 'pending' | 'blocked' | 'completed' | 'override'> => {
      const map = new Map<string, 'confirmed' | 'pending' | 'blocked' | 'completed' | 'override'>();

      // Host-reserved / custom-price dates from datePricing
      if (unit.datePricing) {
        for (const dp of unit.datePricing) {
          const dateKey = new Date(dp.date).toISOString().slice(0, 10);
          if (dp.isBlocked) {
            map.set(dateKey, 'blocked');
          } else if (dp.price && dp.price > 0) {
            map.set(dateKey, 'override');
          }
        }
      }

      // Booked dates from bookings (overrides datePricing status)
      const ub = unitBookingsMap[unit._id];
      if (ub?.loaded) {
        for (const entry of ub.entries) {
          const start = new Date(entry.checkIn);
          const end = new Date(entry.checkOut);
          const checkOutDate = new Date(entry.checkOut);
          const current = new Date(start);
          while (current < end) {
            const key = formatDateKey(current);
            const status = entry.status === 'confirmed'
              ? (checkOutDate < new Date() ? 'completed' : 'confirmed')
              : 'pending';
            map.set(key, status);
            current.setDate(current.getDate() + 1);
          }
        }
      }

      return map;
    },
    [unitBookingsMap]
  );

  /* ── Month navigation ── */
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  /* ── No properties ── */
  if (properties.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          {t.noProperties[lang]}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render                                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div>
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.title[lang]}</h1>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-white border-gray-200 inline-block" />
          {t.defaultDay[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-blue-50 border-blue-200 inline-block" />
          {t.overrideDay[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-red-50 border-red-200 inline-block" />
          {t.hostReserved[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-emerald-50 border-emerald-200 inline-block" />
          {t.upcoming[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-yellow-50 border-yellow-200 inline-block" />
          {t.pending[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-gray-100 border-gray-300 inline-block" />
          {t.completed[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-amber-50 border-amber-200 inline-block" />
          {t.weekend[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white ring-2 ring-primary-400 inline-block" />
          {t.today[lang]}
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
          {isAr ? MONTHS_AR[currentMonth] : MONTHS_EN[currentMonth]} {currentYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
        </button>
      </div>

      {/* Property sections */}
      {properties.map((property) => {
        const pu = propertyUnitsMap[property._id];
        const unitsLoaded = pu?.loaded ?? false;
        const units = pu?.units ?? [];

        return (
          <div key={property._id} className="mb-8">
            {/* Property title */}
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {isAr ? (property.titleAr || property.title) : property.title}
            </h2>

            {/* Units loading */}
            {!unitsLoaded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map((i) => (
                  <MiniCalendarSkeleton key={i} />
                ))}
              </div>
            )}

            {/* No units */}
            {unitsLoaded && units.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                {t.noUnits[lang]}
              </div>
            )}

            {/* Unit mini calendars */}
            {unitsLoaded && units.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map((unit) => {
                  const dayStatusMap = getUnitDayStatus(unit);
                  const bookingsLoaded = unitBookingsMap[unit._id]?.loaded ?? false;
                  const unitName = isAr
                    ? (unit.nameAr || unit.nameEn || unit._id)
                    : (unit.nameEn || unit.nameAr || unit._id);

                  return (
                    <Link
                      key={unit._id}
                      href={`/host/listings/${property._id}/units/${unit._id}/calendar`}
                      className="block bg-white rounded-xl border border-gray-200 p-3 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      {/* Unit name */}
                      <div className="text-sm font-medium text-gray-700 mb-2 truncate">
                        {unitName}
                      </div>

                      {/* Mini calendar */}
                      {!bookingsLoaded ? (
                        <MiniCalendarGridSkeleton />
                      ) : (
                        <MiniCalendarGrid
                          gridDays={gridDays}
                          currentMonth={currentMonth}
                          dayStatusMap={dayStatusMap}
                          lang={lang}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Mini Calendar Grid                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function MiniCalendarGrid({
  gridDays,
  currentMonth,
  dayStatusMap,
  lang,
}: {
  gridDays: Date[];
  currentMonth: number;
  dayStatusMap: Map<string, 'confirmed' | 'pending' | 'blocked' | 'completed' | 'override'>;
  lang: 'en' | 'ar';
}) {
  const todayKey = formatDateKey(new Date());

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_HEADERS.map((day) => (
          <div
            key={day.en}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5"
          >
            {day[lang]}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {gridDays.map((date, idx) => {
          const key = formatDateKey(date);
          const isCurrentMonth = date.getMonth() === currentMonth;
          const status = isCurrentMonth ? dayStatusMap.get(key) : undefined;

          let bgClass = '';
          if (!isCurrentMonth) {
            bgClass = '';
          } else if (status === 'confirmed') {
            bgClass = 'bg-emerald-100';
          } else if (status === 'completed') {
            bgClass = 'bg-gray-100';
          } else if (status === 'pending') {
            bgClass = 'bg-yellow-100';
          } else if (status === 'blocked') {
            bgClass = 'bg-red-100';
          } else if (status === 'override') {
            bgClass = 'bg-blue-100';
          } else if ([4, 5, 6].includes(date.getDay())) {
            bgClass = 'bg-amber-50';
          }

          const isToday = key === todayKey && isCurrentMonth;

          return (
            <div
              key={idx}
              className={`
                flex items-center justify-center
                w-7 h-7 mx-auto
                text-[11px] rounded-md
                ${bgClass}
                ${isToday ? 'ring-2 ring-primary-400' : ''}
                ${isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
              `}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Skeletons                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Legend placeholder */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 rounded" />
        ))}
      </div>
      {/* Month nav placeholder */}
      <div className="h-8 w-48 bg-gray-200 rounded mx-auto" />
      {/* Property sections */}
      {[1, 2].map((p) => (
        <div key={p}>
          <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((u) => (
              <MiniCalendarSkeleton key={u} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniCalendarSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
      <MiniCalendarGridSkeleton />
    </div>
  );
}

function MiniCalendarGridSkeleton() {
  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="grid grid-cols-7 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-3 bg-gray-100 rounded mx-auto w-5" />
        ))}
      </div>
      {/* 5 rows of day cells */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="grid grid-cols-7 gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-7 w-7 bg-gray-100 rounded-md mx-auto" />
          ))}
        </div>
      ))}
    </div>
  );
}
