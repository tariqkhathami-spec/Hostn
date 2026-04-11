'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi, bookingsApi } from '@/lib/api';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  X,
  Loader2,
  Calendar,
  UserCheck,
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

interface BookedDateInfo {
  guestName: string;
  status: string;
}

interface PricingDialogState {
  mode: 'day' | 'weekday' | 'weekend';
  dayKey?: string;
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
  dayPrices:      { en: 'Day-of-week prices',     ar: 'أسعار أيام الأسبوع' },
  setSpecial:     { en: 'Set special price',      ar: 'تعيين سعر خاص' },
  block:          { en: 'Reserved',               ar: 'محجوز' },
  unblock:        { en: 'Unreserve',              ar: 'إلغاء الحجز' },
  removeOverride: { en: 'Remove override',        ar: 'إزالة التخصيص' },
  save:           { en: 'Save',                   ar: 'حفظ' },
  cancel:         { en: 'Cancel',                 ar: 'إلغاء' },
  close:          { en: 'Close',                  ar: 'إغلاق' },
  weekdayDefault: { en: 'Weekday default',        ar: 'السعر الافتراضي (أسبوع)' },
  weekendDefault: { en: 'Weekend default',        ar: 'السعر الافتراضي (نهاية أسبوع)' },
  customPrice:    { en: 'Custom price',           ar: 'سعر مخصص' },
  blocked:        { en: 'Reserved',               ar: 'محجوز' },
  priceSaved:     { en: 'Price updated',          ar: 'تم تحديث السعر' },
  priceBlocked:   { en: 'Date reserved',          ar: 'تم حجز التاريخ' },
  priceUnblocked: { en: 'Date unreserved',        ar: 'تم إلغاء حجز التاريخ' },
  overrideRemoved:{ en: 'Override removed',       ar: 'تمت إزالة التخصيص' },
  error:          { en: 'Something went wrong',   ar: 'حدث خطأ ما' },
  legend:         { en: 'Legend',                  ar: 'دليل الألوان' },
  defaultDay:     { en: 'Default',                ar: 'افتراضي' },
  overrideDay:    { en: 'Custom price',           ar: 'سعر مخصص' },
  blockedDay:     { en: 'Reserved',               ar: 'محجوز' },
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
  newPrice:       { en: 'Price per night',        ar: 'السعر لليلة' },
  bookedDay:      { en: 'Booked',                 ar: 'محجوز (حجز)' },
  clickToEdit:    { en: 'Click to edit',          ar: 'اضغط للتعديل' },
  allWeekdays:    { en: 'Sets price for Sun, Mon, Tue, Wed', ar: 'تعيين السعر للأحد، الإثنين، الثلاثاء، الأربعاء' },
  allWeekends:    { en: 'Sets price for Thu, Fri, Sat',      ar: 'تعيين السعر للخميس، الجمعة، السبت' },
};

const DAY_KEYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_HEADERS = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

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

  // Week starts Sunday. JS: 0=Sun,...,6=Sat — getDay() already gives Sunday-first offset
  const sundayOffset = firstDay.getDay();

  const days: Date[] = [];

  for (let i = sundayOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  while (days.length % 7 !== 0) {
    const next = days.length - sundayOffset - lastDay.getDate() + 1;
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

  // Pricing dialog (replaces old open input fields)
  const [pricingDialog, setPricingDialog] = useState<PricingDialogState | null>(null);
  const [pricingDialogInput, setPricingDialogInput] = useState('');
  const pricingDialogRef = useRef<HTMLDivElement>(null);

  // Day popover
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [specialPriceInput, setSpecialPriceInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Booked dates from actual bookings
  const [bookedDates, setBookedDates] = useState<Map<string, BookedDateInfo>>(new Map());

  const todayKey = formatDateKey(new Date());
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  /* ── Fetch unit data ── */
  const fetchUnit = useCallback(async () => {
    try {
      const res = await unitsApi.getOne(unitId);
      const data: Unit = res.data.data || res.data;
      setUnit(data);
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [unitId, lang]);

  useEffect(() => { fetchUnit(); }, [fetchUnit]);

  /* ── Fetch booked dates ── */
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const res = await bookingsApi.getUnitBookedDates(unitId);
        const bookings = res.data.data || [];
        const map = new Map<string, BookedDateInfo>();
        for (const booking of bookings as { checkIn: string; checkOut: string; status: string; guest?: { name?: string } }[]) {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          const current = new Date(checkIn);
          while (current < checkOut) {
            map.set(formatDateKey(current), {
              guestName: booking.guest?.name || '',
              status: booking.status,
            });
            current.setDate(current.getDate() + 1);
          }
        }
        setBookedDates(map);
      } catch {
        // silently ignore
      }
    };
    fetchBookedDates();
  }, [unitId]);

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

  /* ── Save pricing from dialog ── */
  const savePricingDialog = async () => {
    if (!pricingDialog) return;
    const val = Number(pricingDialogInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      let pricing: Record<string, number> = {};
      if (pricingDialog.mode === 'weekday') {
        pricing = { sunday: val, monday: val, tuesday: val, wednesday: val };
      } else if (pricingDialog.mode === 'weekend') {
        pricing = { thursday: val, friday: val, saturday: val };
      } else if (pricingDialog.dayKey) {
        pricing = { [pricingDialog.dayKey]: val };
      }
      await unitsApi.updatePricing(unitId, { pricing });
      toast.success(t.priceSaved[lang]);
      setPricingDialog(null);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Open pricing dialog ── */
  const openPricingDialog = (mode: 'day' | 'weekday' | 'weekend', dayKey?: string) => {
    setSelectedDate(null);
    let currentVal = '';
    if (mode === 'day' && dayKey) {
      currentVal = String(unit?.pricing?.[dayKey] || '');
    } else if (mode === 'weekday') {
      const avg = Math.round(
        ((unit?.pricing?.sunday || 0) + (unit?.pricing?.monday || 0) +
         (unit?.pricing?.tuesday || 0) + (unit?.pricing?.wednesday || 0)) / 4
      );
      currentVal = avg > 0 ? String(avg) : '';
    } else if (mode === 'weekend') {
      const avg = Math.round(
        ((unit?.pricing?.thursday || 0) + (unit?.pricing?.friday || 0) +
         (unit?.pricing?.saturday || 0)) / 3
      );
      currentVal = avg > 0 ? String(avg) : '';
    }
    setPricingDialogInput(currentVal);
    setPricingDialog({ mode, dayKey });
  };

  /* ── Pricing dialog title ── */
  const getPricingDialogTitle = () => {
    if (!pricingDialog) return '';
    if (pricingDialog.mode === 'weekday') {
      return isAr ? 'تعديل أسعار أيام الأسبوع' : 'Edit Weekday Prices';
    }
    if (pricingDialog.mode === 'weekend') {
      return isAr ? 'تعديل أسعار نهاية الأسبوع' : 'Edit Weekend Prices';
    }
    const dayIndex = DAY_KEYS_EN.indexOf(pricingDialog.dayKey as typeof DAY_KEYS_EN[number]);
    const dayName = isAr ? WEEKDAY_AR[dayIndex] : WEEKDAY_EN[dayIndex];
    return isAr ? `تعديل سعر ${dayName}` : `Edit ${dayName} Price`;
  };

  const getPricingDialogSubtitle = () => {
    if (!pricingDialog) return '';
    if (pricingDialog.mode === 'weekday') return t.allWeekdays[lang];
    if (pricingDialog.mode === 'weekend') return t.allWeekends[lang];
    return '';
  };

  /* ── Day click ── */
  const handleDayClick = (dateKey: string) => {
    if (dateKey < todayKey) return;
    setPricingDialog(null);
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
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

  /* ── Close pricing dialog on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pricingDialogRef.current && !pricingDialogRef.current.contains(e.target as Node)) {
        setPricingDialog(null);
      }
    };
    if (pricingDialog) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pricingDialog]);

  /* ── Selected date info ── */
  const selectedDateInfo = useMemo(() => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate + 'T00:00:00');
    const info = getDayPrice(date);
    const dayIndex = date.getDay();
    const isWeekend = isWeekendDay(dayIndex);
    const override = datePricingMap.get(selectedDate);
    const hasOverride = !!override;
    const bookedInfo = bookedDates.get(selectedDate);

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

    return { date, info, isWeekend, hasOverride, source, dateLabel, isBlocked: !!override?.isBlocked, bookedInfo };
  }, [selectedDate, getDayPrice, datePricingMap, bookedDates, lang, isAr]);

  /* ── Day-of-week badge data ── */
  const dayBadges = useMemo(() => {
    const order = [0, 1, 2, 3, 4, 5, 6];
    const shortNames = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
    return order.map((jsDay, i) => ({
      label: shortNames[i][lang],
      dayKey: DAY_KEYS_EN[jsDay],
      price: unit?.pricing?.[DAY_KEYS_EN[jsDay]] || 0,
      isWeekend: isWeekendDay(jsDay),
    }));
  }, [unit?.pricing, lang]);

  /* ── Group averages ── */
  const weekdayAvg = useMemo(() => {
    if (!unit?.pricing) return 0;
    const p = unit.pricing;
    return Math.round(((p.sunday || 0) + (p.monday || 0) + (p.tuesday || 0) + (p.wednesday || 0)) / 4);
  }, [unit?.pricing]);

  const weekendAvg = useMemo(() => {
    if (!unit?.pricing) return 0;
    const p = unit.pricing;
    return Math.round(((p.thursday || 0) + (p.friday || 0) + (p.saturday || 0)) / 3);
  }, [unit?.pricing]);

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
    <div className="max-w-4xl mx-auto py-6 pb-20">
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
          <SarSymbol size={20} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t.dayPrices[lang]}</h2>
        </div>

        {/* Group headers — clickable cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Weekday group */}
          <button
            onClick={() => openPricingDialog('weekday')}
            className="text-start bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {t.weekdayPrice[lang]}
              </span>
              <span className="text-[10px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {t.clickToEdit[lang]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{t.weekdayDesc[lang]}</p>
            <div className="text-base font-bold text-gray-900" dir="ltr">
              {weekdayAvg > 0 ? (
                <>
                  <SarSymbol size={14} /> {weekdayAvg.toLocaleString('en')}
                  <span className="text-xs text-gray-400 font-normal ms-1">{t.perNight[lang]}</span>
                </>
              ) : (
                <span className="text-gray-400 font-normal">&mdash;</span>
              )}
            </div>
          </button>

          {/* Weekend group */}
          <button
            onClick={() => openPricingDialog('weekend')}
            className="text-start bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 rounded-xl p-4 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {t.weekendPrice[lang]}
              </span>
              <span className="text-[10px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {t.clickToEdit[lang]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{t.weekendDesc[lang]}</p>
            <div className="text-base font-bold text-gray-900" dir="ltr">
              {weekendAvg > 0 ? (
                <>
                  <SarSymbol size={14} /> {weekendAvg.toLocaleString('en')}
                  <span className="text-xs text-gray-400 font-normal ms-1">{t.perNight[lang]}</span>
                </>
              ) : (
                <span className="text-gray-400 font-normal">&mdash;</span>
              )}
            </div>
          </button>
        </div>

        {/* Day-of-week pills — clickable */}
        <div className="flex flex-wrap gap-2">
          {dayBadges.map((badge) => (
            <button
              key={badge.dayKey}
              onClick={() => openPricingDialog('day', badge.dayKey)}
              className={`flex flex-col items-center px-3 py-2.5 rounded-xl text-xs border transition-all cursor-pointer hover:shadow-sm ${
                badge.isWeekend
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">{badge.label}</span>
              <span className="mt-1 font-bold text-sm text-gray-900" dir="ltr">
                {badge.price > 0 ? badge.price.toLocaleString('en') : '\u2014'}
              </span>
            </button>
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
            const bookedInfo = bookedDates.get(key);
            const isBooked = !!bookedInfo && isCurrentMonth;

            // Build cell classes
            let cellBg = 'bg-white';
            let priceBg = '';

            if (!isCurrentMonth) {
              cellBg = 'bg-gray-50';
            } else if (dayInfo.blocked) {
              cellBg = 'bg-red-50';
            } else if (isBooked) {
              cellBg = 'bg-emerald-50';
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
                  {isBooked && !dayInfo.blocked && (
                    <UserCheck className="w-3 h-3 text-emerald-500" />
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

                {isBooked && !dayInfo.blocked && isCurrentMonth && (
                  <div className="mt-0.5 text-[9px] text-emerald-600 font-medium truncate">
                    {t.bookedDay[lang]}
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
          <span className="w-3 h-3 rounded border bg-emerald-50 border-emerald-200 inline-block" />
          {t.bookedDay[lang]}
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

            {/* Booked info banner */}
            {selectedDateInfo.bookedInfo && (
              <div className="rounded-lg p-3 mb-4 bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700">
                    {t.bookedDay[lang]}
                    {selectedDateInfo.bookedInfo.guestName && (
                      <span className="text-emerald-500 font-normal ms-1">&mdash; {selectedDateInfo.bookedInfo.guestName}</span>
                    )}
                  </span>
                </div>
              </div>
            )}

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
                      onKeyDown={(e) => { if (e.key === 'Enter') saveSpecialPrice(); }}
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

      {/* ── Pricing Dialog ── */}
      {pricingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div
            ref={pricingDialogRef}
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {getPricingDialogTitle()}
                </h3>
                {getPricingDialogSubtitle() && (
                  <p className="text-xs text-gray-400 mt-0.5">{getPricingDialogSubtitle()}</p>
                )}
              </div>
              <button
                onClick={() => setPricingDialog(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.newPrice[lang]}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={pricingDialogInput}
                  onChange={(e) => setPricingDialogInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') savePricingDialog(); }}
                  placeholder="0"
                  className="w-full px-3 py-2.5 pe-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  autoFocus
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SarSymbol size={11} />
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setPricingDialog(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t.cancel[lang]}
              </button>
              <button
                onClick={savePricingDialog}
                disabled={saving || !pricingDialogInput || Number(pricingDialogInput) <= 0}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t.save[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
