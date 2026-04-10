'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi } from '@/lib/api';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  X,
  Loader2,
  Calendar,
  DollarSign,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import type { Unit } from '@/types';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Types                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface DatePricingEntry {
  date: string;
  price?: number;
  isBlocked?: boolean;
}

interface DayPriceInfo {
  price: number;
  blocked: boolean;
  isOverride: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Translations                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const t: Record<string, Record<string, string>> = {
  title:          { en: 'Pricing & Availability', ar: 'الأسعار والتوفر' },
  back:           { en: 'Back to units',          ar: 'العودة للوحدات' },
  weekdayPrice:   { en: 'Weekday Price',          ar: 'سعر أيام الأسبوع' },
  weekendPrice:   { en: 'Weekend Price',          ar: 'سعر نهاية الأسبوع' },
  weekdayDesc:    { en: 'Sun \u2013 Wed',         ar: 'الأحد \u2013 الأربعاء' },
  weekendDesc:    { en: 'Thu \u2013 Sat',         ar: 'الخميس \u2013 السبت' },
  apply:          { en: 'Apply',                  ar: 'تطبيق' },
  dayPrices:      { en: 'Day-of-week prices',     ar: 'أسعار أيام الأسبوع' },
  setSpecial:     { en: 'Set special price',      ar: 'تعيين سعر خاص' },
  block:          { en: 'Block',                  ar: 'حظر' },
  unblock:        { en: 'Unblock',                ar: 'إلغاء الحظر' },
  removeOverride: { en: 'Remove override',        ar: 'إزالة التخصيص' },
  save:           { en: 'Save',                   ar: 'حفظ' },
  cancel:         { en: 'Cancel',                 ar: 'إلغاء' },
  close:          { en: 'Close',                  ar: 'إغلاق' },
  weekdayDefault: { en: 'Weekday default',        ar: 'السعر الافتراضي (أسبوع)' },
  weekendDefault: { en: 'Weekend default',        ar: 'السعر الافتراضي (نهاية أسبوع)' },
  customPrice:    { en: 'Custom price',           ar: 'سعر مخصص' },
  blocked:        { en: 'Blocked',                ar: 'محظور' },
  priceSaved:     { en: 'Price updated',          ar: 'تم تحديث السعر' },
  priceBlocked:   { en: 'Date blocked',           ar: 'تم حظر التاريخ' },
  priceUnblocked: { en: 'Date unblocked',         ar: 'تم إلغاء حظر التاريخ' },
  overrideRemoved:{ en: 'Override removed',        ar: 'تمت إزالة التخصيص' },
  error:          { en: 'Something went wrong',   ar: 'حدث خطأ ما' },
  legend:         { en: 'Legend',                  ar: 'دليل الألوان' },
  defaultDay:     { en: 'Default',                ar: 'افتراضي' },
  overrideDay:    { en: 'Custom price',           ar: 'سعر مخصص' },
  blockedDay:     { en: 'Blocked',                ar: 'محظور' },
  weekendDay:     { en: 'Weekend',                ar: 'نهاية الأسبوع' },
  today:          { en: 'Today',                  ar: 'اليوم' },
  sun:            { en: 'Sun', ar: 'أحد' },
  mon:            { en: 'Mon', ar: 'إثنين' },
  tue:            { en: 'Tue', ar: 'ثلاثاء' },
  wed:            { en: 'Wed', ar: 'أربعاء' },
  thu:            { en: 'Thu', ar: 'خميس' },
  fri:            { en: 'Fri', ar: 'جمعة' },
  sat:            { en: 'Sat', ar: 'سبت' },
  perNight:       { en: '/ night', ar: '/ ليلة' },
};

const DAY_KEYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_HEADERS = [t.sat, t.sun, t.mon, t.tue, t.wed, t.thu, t.fri];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Month names                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Saudi week starts Saturday. JS: 0=Sun,...,6=Sat
  // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const saturdayOffset = (firstDay.getDay() + 1) % 7;

  const days: Date[] = [];

  for (let i = saturdayOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  while (days.length % 7 !== 0) {
    const next = days.length - saturdayOffset - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

/** Check if a day-of-week index (JS) is a weekend (Thu=4, Fri=5, Sat=6) */
function isWeekendDay(dayIndex: number): boolean {
  return dayIndex === 4 || dayIndex === 5 || dayIndex === 6;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Component                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function UnitPricingPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'الأسعار والتوفر' : 'Pricing & Availability');

  /* ── state ── */
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Pricing panel inputs
  const [weekdayInput, setWeekdayInput] = useState('');
  const [weekendInput, setWeekendInput] = useState('');

  // Day popover
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [specialPriceInput, setSpecialPriceInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const todayKey = formatDateKey(new Date());
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  /* ── Fetch unit data ── */
  const fetchUnit = useCallback(async () => {
    try {
      const res = await unitsApi.getOne(unitId);
      const data: Unit = res.data.data || res.data;
      setUnit(data);
      // Populate input defaults from current pricing
      if (data.pricing) {
        const p = data.pricing;
        // Weekday = average of Sun-Wed
        const weekdayAvg = Math.round(
          ((p.sunday || 0) + (p.monday || 0) + (p.tuesday || 0) + (p.wednesday || 0)) / 4
        );
        const weekendAvg = Math.round(
          ((p.thursday || 0) + (p.friday || 0) + (p.saturday || 0)) / 3
        );
        setWeekdayInput(weekdayAvg > 0 ? String(weekdayAvg) : '');
        setWeekendInput(weekendAvg > 0 ? String(weekendAvg) : '');
      }
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [unitId, lang]);

  useEffect(() => { fetchUnit(); }, [fetchUnit]);

  /* ── datePricing map ── */
  const datePricingMap = useMemo(() => {
    const map = new Map<string, DatePricingEntry>();
    if (!unit?.datePricing) return map;
    for (const entry of unit.datePricing as unknown as DatePricingEntry[]) {
      const dateStr = new Date(entry.date).toISOString().slice(0, 10);
      map.set(dateStr, { ...entry, date: dateStr });
    }
    return map;
  }, [unit?.datePricing]);

  /* ── Price computation per day ── */
  const getDayPrice = useCallback(
    (date: Date): DayPriceInfo => {
      const dateStr = formatDateKey(date);
      const override = datePricingMap.get(dateStr);
      if (override?.isBlocked) return { price: 0, blocked: true, isOverride: false };
      if (override?.price != null && override.price > 0) return { price: override.price, blocked: false, isOverride: true };
      const dayName = DAY_KEYS_EN[date.getDay()];
      return { price: unit?.pricing?.[dayName] || 0, blocked: false, isOverride: false };
    },
    [datePricingMap, unit?.pricing],
  );

  /* ── Calendar grid ── */
  const gridDays = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  /* ── Navigation ── */
  const canGoPrev = currentYear > nowYear || (currentYear === nowYear && currentMonth > nowMonth);

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDate(null);
  };

  /* ── Apply weekday price ── */
  const applyWeekday = async () => {
    const val = Number(weekdayInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        pricing: {
          sunday: val,
          monday: val,
          tuesday: val,
          wednesday: val,
        },
      });
      toast.success(t.priceSaved[lang]);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  const applyWeekend = async () => {
    const val = Number(weekendInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        pricing: {
          thursday: val,
          friday: val,
          saturday: val,
        },
      });
      toast.success(t.priceSaved[lang]);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Day click ── */
  const handleDayClick = (dateKey: string) => {
    if (dateKey < todayKey) return;
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
    // Pre-fill special price input with current override or default
    const date = new Date(dateKey + 'T00:00:00');
    const info = getDayPrice(date);
    setSpecialPriceInput(info.price > 0 ? String(info.price) : '');
  };

  /* ── Save special price ── */
  const saveSpecialPrice = async () => {
    if (!selectedDate) return;
    const val = Number(specialPriceInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        datePricing: [{ date: selectedDate, price: val, isBlocked: false }],
      });
      toast.success(t.priceSaved[lang]);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Block / Unblock ── */
  const toggleBlock = async (block: boolean) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        datePricing: [{ date: selectedDate, isBlocked: block }],
      });
      toast.success(block ? t.priceBlocked[lang] : t.priceUnblocked[lang]);
      setSelectedDate(null);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Remove override ── */
  const removeOverride = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        datePricing: [{ date: selectedDate, remove: true }],
      });
      toast.success(t.overrideRemoved[lang]);
      setSelectedDate(null);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Close popover on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedDate(null);
      }
    };
    if (selectedDate) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedDate]);

  /* ── Selected date info ── */
  const selectedDateInfo = useMemo(() => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate + 'T00:00:00');
    const info = getDayPrice(date);
    const dayIndex = date.getDay();
    const isWeekend = isWeekendDay(dayIndex);
    const override = datePricingMap.get(selectedDate);
    const hasOverride = !!override;

    let source: string;
    if (override?.isBlocked) {
      source = t.blocked[lang];
    } else if (override?.price != null && override.price > 0) {
      source = t.customPrice[lang];
    } else if (isWeekend) {
      source = t.weekendDefault[lang];
    } else {
      source = t.weekdayDefault[lang];
    }

    const dayNameFull = isAr ? WEEKDAY_AR[dayIndex] : WEEKDAY_EN[dayIndex];
    const monthName = isAr ? MONTHS_AR[date.getMonth()] : MONTHS_EN[date.getMonth()];
    const dateLabel = isAr
      ? `${dayNameFull}، ${date.getDate()} ${monthName}`
      : `${dayNameFull}, ${monthName} ${date.getDate()}`;

    return { date, info, isWeekend, hasOverride, source, dateLabel, isBlocked: !!override?.isBlocked };
  }, [selectedDate, getDayPrice, datePricingMap, lang, isAr]);

  /* ── Day-of-week badge data ── */
  const dayBadges = useMemo(() => {
    // Order: Sat, Sun, Mon, Tue, Wed, Thu, Fri (Saudi week)
    const order = [6, 0, 1, 2, 3, 4, 5]; // JS day indices
    const shortNames = [t.sat, t.sun, t.mon, t.tue, t.wed, t.thu, t.fri];
    return order.map((jsDay, i) => ({
      label: shortNames[i][lang],
      price: unit?.pricing?.[DAY_KEYS_EN[jsDay]] || 0,
      isWeekend: isWeekendDay(jsDay),
    }));
  }, [unit?.pricing, lang]);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render                                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        {t.error[lang]}
      </div>
    );
  }

  const unitName = isAr ? (unit.nameAr || unit.nameEn || '') : (unit.nameEn || unit.nameAr || '');

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <Link
          href={`/host/listings/${propertyId}/units`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t.back[lang]}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.title[lang]}</h1>
        {unitName && (
          <p className="text-sm text-gray-500 mt-1">{unitName}</p>
        )}
      </div>

      {/* ── Pricing Settings Panel ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t.dayPrices[lang]}</h2>
        </div>

        {/* Weekday / Weekend inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Weekday */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.weekdayPrice[lang]}
            </label>
            <p className="text-xs text-gray-400 mb-2">{t.weekdayDesc[lang]}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  value={weekdayInput}
                  onChange={(e) => setWeekdayInput(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 pe-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  <SarSymbol size={12} />
                </span>
              </div>
              <button
                onClick={applyWeekday}
                disabled={saving || !weekdayInput}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.apply[lang]}
              </button>
            </div>
          </div>

          {/* Weekend */}
          <div className="bg-amber-50/60 rounded-lg p-4 border border-amber-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.weekendPrice[lang]}
            </label>
            <p className="text-xs text-gray-400 mb-2">{t.weekendDesc[lang]}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  value={weekendInput}
                  onChange={(e) => setWeekendInput(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 pe-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  <SarSymbol size={12} />
                </span>
              </div>
              <button
                onClick={applyWeekend}
                disabled={saving || !weekendInput}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.apply[lang]}
              </button>
            </div>
          </div>
        </div>

        {/* Day-of-week badges */}
        <div className="flex flex-wrap gap-2">
          {dayBadges.map((badge) => (
            <div
              key={badge.label}
              className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs border ${
                badge.isWeekend
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <span className="font-medium">{badge.label}</span>
              <span className="mt-0.5 font-semibold" dir="ltr">
                {badge.price > 0 ? badge.price.toLocaleString('en') : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar Section ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 relative">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-semibold text-gray-800">
              {isAr ? MONTHS_AR[currentMonth] : MONTHS_EN[currentMonth]} {currentYear}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_HEADERS.map((day) => (
            <div key={day.en} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
              {day[lang]}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {gridDays.map((date, idx) => {
            const key = formatDateKey(date);
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isPast = key < todayKey;
            const isToday = key === todayKey;
            const dayInfo = getDayPrice(date);
            const isWeekend = isWeekendDay(date.getDay());
            const isSelected = key === selectedDate;
            const isClickable = isCurrentMonth && !isPast;

            // Build cell classes
            let cellBg = 'bg-white';
            let priceBg = '';

            if (!isCurrentMonth) {
              cellBg = 'bg-gray-50';
            } else if (dayInfo.blocked) {
              cellBg = 'bg-red-50';
            } else if (dayInfo.isOverride) {
              cellBg = 'bg-blue-50';
            } else if (isWeekend) {
              cellBg = 'bg-amber-50/50';
            }

            if (dayInfo.blocked) {
              priceBg = 'text-red-400';
            } else if (dayInfo.isOverride) {
              priceBg = 'text-blue-600 font-semibold';
            } else {
              priceBg = 'text-gray-500';
            }

            return (
              <div
                key={idx}
                onClick={() => isClickable && handleDayClick(key)}
                className={`
                  relative min-h-[70px] p-2 ${cellBg}
                  ${isCurrentMonth ? '' : 'opacity-40'}
                  ${isPast && isCurrentMonth ? 'opacity-50' : ''}
                  ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary-300 hover:ring-inset' : ''}
                  ${isToday ? 'ring-2 ring-primary-400 ring-inset z-[1]' : ''}
                  ${isSelected ? 'ring-2 ring-primary-500 ring-inset z-[2] bg-primary-50' : ''}
                  ${dayInfo.blocked && isCurrentMonth ? 'border-red-200' : ''}
                  ${dayInfo.isOverride && isCurrentMonth ? 'border-blue-200' : ''}
                  transition-all
                `}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-sm font-medium ${
                    !isCurrentMonth ? 'text-gray-300' :
                    isToday ? 'text-primary-600 font-bold' :
                    dayInfo.blocked ? 'text-red-400' :
                    'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </span>
                  {dayInfo.blocked && isCurrentMonth && (
                    <Lock className="w-3 h-3 text-red-400" />
                  )}
                </div>

                {isCurrentMonth && !dayInfo.blocked && dayInfo.price > 0 && (
                  <div className={`mt-1 text-xs ${priceBg}`} dir="ltr">
                    <SarSymbol size={9} /> {dayInfo.price.toLocaleString('en')}
                  </div>
                )}

                {isCurrentMonth && dayInfo.blocked && (
                  <div className="mt-1 text-xs text-red-400 font-medium">
                    {t.blocked[lang]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-500">
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
          {t.blockedDay[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-amber-50 border-amber-200 inline-block" />
          {t.weekendDay[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded ring-2 ring-primary-400 bg-white inline-block" />
          {t.today[lang]}
        </span>
      </div>

      {/* ── Day Detail Popover ── */}
      {selectedDate && selectedDateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div
            ref={popoverRef}
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {selectedDateInfo.dateLabel}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current price info */}
            <div className={`rounded-lg p-3 mb-4 ${
              selectedDateInfo.isBlocked ? 'bg-red-50 border border-red-100' :
              selectedDateInfo.info.isOverride ? 'bg-blue-50 border border-blue-100' :
              'bg-gray-50 border border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{selectedDateInfo.source}</span>
                {selectedDateInfo.isBlocked ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                    <Lock className="w-3.5 h-3.5" />
                    {t.blocked[lang]}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-gray-900" dir="ltr">
                    <SarSymbol size={12} /> {selectedDateInfo.info.price.toLocaleString('en')}
                    <span className="text-xs text-gray-400 ms-1">{t.perNight[lang]}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Set special price */}
            {!selectedDateInfo.isBlocked && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t.setSpecial[lang]}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      value={specialPriceInput}
                      onChange={(e) => setSpecialPriceInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 pe-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <SarSymbol size={11} />
                    </span>
                  </div>
                  <button
                    onClick={saveSpecialPrice}
                    disabled={saving || !specialPriceInput || Number(specialPriceInput) <= 0}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save[lang]}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {/* Block / Unblock */}
              {selectedDateInfo.isBlocked ? (
                <button
                  onClick={() => toggleBlock(false)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  {t.unblock[lang]}
                </button>
              ) : (
                <button
                  onClick={() => toggleBlock(true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {t.block[lang]}
                </button>
              )}

              {/* Remove override */}
              {selectedDateInfo.hasOverride && (
                <button
                  onClick={removeOverride}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {t.removeOverride[lang]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
