'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi, bookingsApi, propertiesApi } from '@/lib/api';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  X,
  Loader2,
  Calendar,
  UserCheck,
  DollarSign,
  Percent,
  Trash2,
  Plus,
  MousePointerSquareDashed,
  Eraser,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import type { Unit } from '@/types';
import {
  applicableDiscountsForNight,
  effectiveDiscountPercent,
  markAppliedDiscounts,
  DISCOUNT_COLORS,
  type DiscountType,
  type PricingUnit,
} from '@/lib/pricing';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Types                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface DatePricingEntry {
  date: string;
  price?: number;
  isBlocked?: boolean;
  discountPercent?: number;
  discountStackable?: boolean;
}

interface DayPriceInfo {
  price: number;
  blocked: boolean;
  isOverride: boolean;
}

interface BookedDateInfo {
  guestName: string;
  status: string;
  checkOut: string;
}

interface PricingDialogState {
  mode: 'day' | 'weekday' | 'weekend';
  dayKey?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Translations                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const t: Record<string, Record<string, string>> = {
  title:          { en: 'Calendar', ar: 'التقويم' },
  back:           { en: 'Back to units',          ar: 'العودة للوحدات' },
  weekdayPrice:   { en: 'Weekday Price',          ar: 'سعر أيام الأسبوع' },
  weekendPrice:   { en: 'Weekend Price',          ar: 'سعر نهاية الأسبوع' },
  weekdayDesc:    { en: 'Sun \u2013 Wed',         ar: 'الأحد \u2013 الأربعاء' },
  weekendDesc:    { en: 'Thu \u2013 Sat',         ar: 'الخميس \u2013 السبت' },
  dayPrices:      { en: 'Day-of-week prices',     ar: 'أسعار أيام الأسبوع' },
  setSpecial:     { en: 'Set special price',      ar: 'تعيين سعر خاص' },
  // D3: action buttons renamed so they're distinct from the "Reserved" status.
  block:          { en: 'Block',                  ar: 'حجز' },
  unblock:        { en: 'Unblock',                ar: 'إلغاء الحجز' },
  removeOverride: { en: 'Reset to default',       ar: 'إعادة للافتراضي' },
  resetPrice:     { en: 'Also reset price to default', ar: 'إعادة السعر للافتراضي أيضاً' },
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
  // Tab labels
  pricingTab:     { en: 'Pricing',    ar: 'الأسعار' },
  discountTab:    { en: 'Discount',   ar: 'الخصومات' },
  // Multiselect action bar
  setPrice:       { en: 'Set Price',  ar: 'تعيين السعر' },
  clearSel:       { en: 'Clear',      ar: 'مسح' },
  days:           { en: 'days',       ar: 'أيام' },
  day:            { en: 'day',        ar: 'يوم' },
  priceForRange:  { en: 'Price for selected dates', ar: 'السعر للتواريخ المختارة' },
  applied:        { en: 'Applied to selected dates', ar: 'تم التطبيق على التواريخ المختارة' },
  // Discount section
  globalDiscount: { en: 'Global Discount',  ar: 'خصم عام' },
  globalDiscountDesc: { en: 'Applies to all bookings', ar: 'ينطبق على جميع الحجوزات' },
  weeklyDiscount: { en: 'Weekly Discount',  ar: 'خصم أسبوعي' },
  weeklyDiscountDesc: { en: 'For stays of 7+ nights', ar: 'للإقامات 7 ليالٍ أو أكثر' },
  dayDiscounts:   { en: 'Date-Specific Discounts', ar: 'خصومات حسب التاريخ' },
  dayDiscountsDesc: { en: 'Select dates on calendar, then set discount %', ar: 'حدد التواريخ من التقويم ثم عيّن نسبة الخصم' },
  discountPercent:{ en: 'Discount %',       ar: 'نسبة الخصم %' },
  setDiscount:    { en: 'Set Discount',     ar: 'تعيين الخصم' },
  discountSaved:  { en: 'Discount updated', ar: 'تم تحديث الخصم' },
  noDiscount:     { en: 'No discount set',  ar: 'لا يوجد خصم' },
  off:            { en: 'off',              ar: 'خصم' },
  // Long-stay discounts
  monthlyDiscount:     { en: 'Monthly Discount',     ar: 'خصم شهري' },
  monthlyDiscountDesc: { en: 'For stays of 30+ nights', ar: 'للإقامات 30 ليلة أو أكثر' },
  longStayDiscounts:   { en: 'Long-stay Discounts',  ar: 'خصومات الإقامة الطويلة' },
  // D1: Multi-select toggle (replaces old "Select Range")
  multiSelect:    { en: 'Multi-select',   ar: 'تحديد متعدد' },
  normalMode:     { en: 'Single Day',     ar: 'يوم واحد' },
  multiSelectHint:{ en: 'Click a date to toggle, or click-and-drag to select many', ar: 'انقر تاريخاً للتحديد، أو انقر واسحب لتحديد عدة تواريخ' },
  // Unblock note
  keepPriceNote:  { en: 'Custom price will be kept', ar: 'سيتم الاحتفاظ بالسعر المخصص' },
  // D2: Clear dropdown — each option is scoped to the current selection
  clearMenu:         { en: 'Clear / Reset', ar: 'مسح / إعادة' },
  clearSelection:    { en: 'Clear selection',          ar: 'مسح التحديد' },
  clearPriceOvr:     { en: 'Remove price overrides',   ar: 'إزالة الأسعار المخصصة' },
  clearDiscountOvr:  { en: 'Remove discount overrides',ar: 'إزالة الخصومات' },
  clearBlock:        { en: 'Unblock dates',            ar: 'إلغاء الحجز' },
  pricesCleared:     { en: 'Price overrides removed',  ar: 'تمت إزالة الأسعار المخصصة' },
  discountsCleared:  { en: 'Discount overrides removed', ar: 'تمت إزالة الخصومات' },
  // D4: Discount summary inside single-date dialog
  discountsApplied:  { en: 'Applicable discounts',     ar: 'الخصومات المطبقة' },
  discountGlobal:    { en: 'Global',   ar: 'عام' },
  discountWeekly:    { en: 'Weekly',   ar: 'أسبوعي' },
  discountMonthly:   { en: 'Monthly',  ar: 'شهري' },
  discountWeekday:   { en: 'Weekdays',  ar: 'أيام الأسبوع' },
  discountWeekend:   { en: 'Weekend',  ar: 'نهاية الأسبوع' },
  discountDate:      { en: 'Date-specific', ar: 'حسب التاريخ' },
  noDiscountForDay:  { en: 'No discount applies to this day', ar: 'لا يوجد خصم ينطبق على هذا اليوم' },
  effectivePrice:    { en: 'After discount', ar: 'بعد الخصم' },
  // E4: Unified Discounts card
  discountsTitle:    { en: 'Discounts', ar: 'الخصومات' },
  addDiscount:       { en: 'Add discount', ar: 'إضافة خصم' },
  noDiscountsYet:    { en: 'No discounts yet', ar: 'لا توجد خصومات بعد' },
  stackable:         { en: 'Stackable', ar: 'قابل للتجميع' },
  stackableHint:     { en: 'Stackable discounts add on top of the highest non-stackable one', ar: 'الخصومات القابلة للتجميع تُضاف فوق أعلى خصم غير قابل للتجميع' },
  globalAlways:      { en: 'Always applies', ar: 'ينطبق دائماً' },
  weeklyCondition:   { en: 'For stays of 7+ nights', ar: 'للإقامات 7 ليالٍ فأكثر' },
  monthlyCondition:  { en: 'For stays of 30+ nights', ar: 'للإقامات 30 ليلة فأكثر' },
  weekdaysCondition: { en: 'Sun–Wed', ar: 'الأحد–الأربعاء' },
  weekendsCondition: { en: 'Thu–Sat', ar: 'الخميس–السبت' },
  datesCondition:    { en: 'Selected dates', ar: 'التواريخ المحددة' },
  discountType:      { en: 'Type', ar: 'النوع' },
  discountPercentLabel: { en: 'Percent', ar: 'النسبة' },
  dateSelectFirst:   { en: 'Select dates on the calendar first', ar: 'حدد التواريخ من التقويم أولاً' },
  alreadyAdded:      { en: 'Already added', ar: 'مُضاف بالفعل' },
  // PR F
  enabled:           { en: 'Enabled',  ar: 'مفعل' },
  notApplied:        { en: 'Not applied', ar: 'لا ينطبق' },
  appliedTag:        { en: 'Applied',  ar: 'ينطبق' },
  discountForDate:   { en: 'Date discount', ar: 'خصم لهذا التاريخ' },
  selectedOutOfMonth:{ en: 'dates selected outside this month', ar: 'تواريخ محددة خارج هذا الشهر' },
  setDiscountSave:   { en: 'Set Discount', ar: 'تعيين الخصم' },
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
  const router = useRouter();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'التقويم' : 'Calendar');

  // PR J: property/unit switcher at the top of the page. Host can jump
  // between their properties and units without going back to /listings.
  interface SwitcherProperty { _id: string; title: string; titleAr?: string; }
  interface SwitcherUnit { _id: string; nameEn?: string; nameAr?: string; }
  const [switcherProperties, setSwitcherProperties] = useState<SwitcherProperty[]>([]);
  const [switcherUnits, setSwitcherUnits] = useState<SwitcherUnit[]>([]);
  useEffect(() => {
    propertiesApi.getMyProperties()
      .then((res) => setSwitcherProperties(res.data.data || res.data || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!propertyId) return;
    unitsApi.getManage(propertyId)
      .then((res) => setSwitcherUnits(res.data.data || []))
      .catch(() => setSwitcherUnits([]));
  }, [propertyId]);
  const handlePropertyChange = (newPropId: string) => {
    if (newPropId === propertyId) return;
    // Go to the property's unit list so the host can pick which unit's
    // calendar to view. (Different properties have different units.)
    router.push(`/listings/${newPropId}/units`);
  };
  const handleUnitChange = (newUnitId: string) => {
    if (newUnitId === unitId) return;
    router.push(`/listings/${propertyId}/units/${newUnitId}/calendar`);
  };

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

  // Tab toggle (4E)
  const [activeTab, setActiveTab] = useState<'pricing' | 'discount'>('pricing');

  // D1: Multi-select state — replaces the old range (start/end) model with a
  // free-form Set of selected date keys. A click toggles, a pointer-drag adds.
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const dragAnchorRef = useRef<string | null>(null);
  // Tracks whether dragging started on an already-selected date, so we can
  // treat the drag as a "remove" operation instead of "add" (intuitive toggle).
  const dragRemovingRef = useRef<boolean>(false);
  const [rangePrice, setRangePrice] = useState('');
  const [showRangePriceDialog, setShowRangePriceDialog] = useState(false);
  // D2: Clear/reset dropdown open state
  const [showClearMenu, setShowClearMenu] = useState(false);
  const clearMenuRef = useRef<HTMLDivElement>(null);

  // Discount rules — now include a per-rule `stackable` flag (PR E).
  const [discountRules, setDiscountRules] = useState<{ type: 'weekday' | 'weekend'; percent: number; stackable?: boolean; enabled?: boolean }[]>([]);
  // E4: Unified "Add discount" dialog replaces the old weekday/weekend-only
  // add dialog. Type can be any of the 6 discount types.
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [newDiscountType, setNewDiscountType] = useState<DiscountType>('global');
  const [newDiscountPercent, setNewDiscountPercent] = useState(10);
  const [newDiscountStackable, setNewDiscountStackable] = useState(false);
  const [showRangeDiscountDialog, setShowRangeDiscountDialog] = useState(false);
  const [rangeDiscountPercent, setRangeDiscountPercent] = useState(10);
  const [rangeDiscountStackable, setRangeDiscountStackable] = useState(false);

  // Saving flags for the 3 pricing-discount fields — E4's unified UI uses
  // `savePricingDiscount(kind, percent, stackable)` which flips the matching flag.
  const [savingGlobalDiscount, setSavingGlobalDiscount] = useState(false);
  const [savingWeeklyDiscount, setSavingWeeklyDiscount] = useState(false);
  const [savingMonthlyDiscount, setSavingMonthlyDiscount] = useState(false);

  // D1 + F: Mode toggle — "Single day" (click opens popover) vs "Multi-select"
  // (click toggles a date, drag fills across a range). Persisted in
  // localStorage so the host's last choice survives reload.
  const [multiSelectMode, setMultiSelectModeState] = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('hostn_calendar_multiSelectMode');
      if (saved === '1') setMultiSelectModeState(true);
    } catch { /* ignore */ }
  }, []);
  const setMultiSelectMode = useCallback((next: boolean) => {
    setMultiSelectModeState(next);
    try {
      window.localStorage.setItem('hostn_calendar_multiSelectMode', next ? '1' : '0');
    } catch { /* ignore */ }
  }, []);

  // F: Single-date dialog discount state (item 3)
  const [singleDiscountInput, setSingleDiscountInput] = useState('');
  const [singleDiscountStackable, setSingleDiscountStackable] = useState(false);

  const todayKey = formatDateKey(new Date());
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  /* ── Fetch unit data ── */
  const fetchUnit = useCallback(async (): Promise<Unit | null> => {
    try {
      const res = await unitsApi.getOne(unitId);
      const data: Unit = res.data.data || res.data;
      setUnit(data);
      return data;
    } catch {
      toast.error(t.error[lang]);
      return null;
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
              checkOut: booking.checkOut,
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

  /* ── D1: Multi-select helpers ── */
  const clearSelection = useCallback(() => {
    setSelectedSet(new Set());
    setShowRangePriceDialog(false);
    setRangePrice('');
    setShowRangeDiscountDialog(false);
    setRangeDiscountPercent(10);
    setShowClearMenu(false);
  }, []);

  const selectionDayCount = selectedSet.size;

  /* ── Sync local discount rules from fetched unit ── */
  useEffect(() => {
    setDiscountRules(unit?.discountRules || []);
  }, [unit]);

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

  // F: navigating months no longer wipes the multi-select — the host can
  // span multiple months in a single selection. The popover for a specific
  // date still closes on nav since the selected date is no longer in view.
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

  /* ── D1: Day click — single-click in normal mode opens popover; in
     multi-select mode a simple click toggles. Drag is handled separately
     in the pointer event handlers. ── */
  const handleDayClick = (dateKey: string) => {
    if (dateKey < todayKey) return;
    if (bookedDates.has(dateKey)) return;

    setPricingDialog(null);

    if (multiSelectMode) {
      // In multi-select mode, clicks are handled by the pointer-down handler
      // so the click event here is a no-op (prevents double-toggle).
      return;
    }

    // Single-day mode: open the day popover.
    // F: don't clear the multi-select set — the host can flip between single
    // and multi modes (and between months) without losing their selection.
    setSelectedDate(dateKey);
    const date = new Date(dateKey + 'T00:00:00');
    const info = getDayPrice(date);
    setSpecialPriceInput(info.price > 0 ? String(info.price) : '');
    // F: seed the dialog's discount inputs from any existing per-date override
    const override = datePricingMap.get(dateKey);
    setSingleDiscountInput(override?.discountPercent ? String(override.discountPercent) : '');
    setSingleDiscountStackable(!!override?.discountStackable);
  };

  /* ── D1: Pointer-down on a day cell in multi-select mode starts a drag.
     We also toggle the anchor date immediately so a simple click (no drag)
     still works. Whether the drag adds or removes depends on the anchor's
     initial state — this mirrors the feel of selecting icons on a desktop. ── */
  const handleDayPointerDown = (dateKey: string, e: React.PointerEvent) => {
    if (!multiSelectMode) return;
    if (dateKey < todayKey) return;
    if (bookedDates.has(dateKey)) return;
    e.preventDefault();
    // Release default pointer capture so pointerenter on other cells fires
    // normally while the button/cell is "pressed".
    (e.target as Element).releasePointerCapture?.(e.pointerId);

    const wasSelected = selectedSet.has(dateKey);
    dragAnchorRef.current = dateKey;
    dragRemovingRef.current = wasSelected;
    setIsDragging(true);

    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (wasSelected) next.delete(dateKey); else next.add(dateKey);
      return next;
    });
  };

  const handleDayPointerEnter = (dateKey: string) => {
    if (!isDragging || !multiSelectMode) return;
    if (dateKey < todayKey) return;
    if (bookedDates.has(dateKey)) return;
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (dragRemovingRef.current) next.delete(dateKey); else next.add(dateKey);
      return next;
    });
  };

  // Global pointer-up to end a drag (pointer can leave the calendar).
  useEffect(() => {
    if (!isDragging) return;
    const end = () => {
      setIsDragging(false);
      dragAnchorRef.current = null;
      dragRemovingRef.current = false;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [isDragging]);

  /* ── Save special price (D5: auto-close popover on success)
     F: setting a price on a single date ALSO clears any date-specific
     discount on that date (mutual exclusion per item 10). ── */
  const saveSpecialPrice = async () => {
    if (!selectedDate) return;
    const val = Number(specialPriceInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        // `null` marks a field for clearing in the backend merge-patch.
        datePricing: [{ date: selectedDate, price: val, isBlocked: false, discountPercent: null, discountStackable: false }],
      });
      toast.success(t.priceSaved[lang]);
      setSelectedDate(null);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── F: Save per-date discount from the single-date dialog.
     Also clears any custom price override on that date (mutual exclusion). */
  const saveSingleDiscount = async () => {
    if (!selectedDate) return;
    const val = Number(singleDiscountInput);
    if (isNaN(val) || val < 0 || val > 100) return;
    setSaving(true);
    try {
      await unitsApi.updatePricing(unitId, {
        datePricing: [{
          date: selectedDate,
          // Send `null` to explicitly clear the existing price override.
          price: null,
          isBlocked: false,
          discountPercent: val || null,
          discountStackable: val > 0 ? singleDiscountStackable : false,
        }],
      });
      toast.success(t.discountSaved[lang]);
      setSelectedDate(null);
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
      // On block, close popover; on unblock, keep it open so user sees updated state
      if (block) setSelectedDate(null);
      const fresh = await fetchUnit();
      // PR J: after UNBLOCK, re-seed the special-price input from the
      // REFRESHED unit data directly (can't use getDayPrice — its `unit`
      // closure is stale until the next render). Without this, users saw
      // an empty/zero input even though PR F preserved the price server-side.
      if (!block && fresh) {
        const override = (fresh.datePricing || []).find(
          (dp) => new Date(dp.date).toISOString().slice(0, 10) === selectedDate,
        );
        let price = 0;
        if (override?.price && override.price > 0) {
          price = override.price;
        } else {
          const d = new Date(selectedDate + 'T00:00:00');
          const dayKey = DAY_KEYS_EN[d.getDay()];
          const dayPrice = fresh.pricing?.[dayKey];
          if (typeof dayPrice === 'number') price = dayPrice;
        }
        setSpecialPriceInput(price > 0 ? String(price) : '');
      }
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

  /* ── Multiselect actions (4D) ──
     F: setting a price on a range CLEARS any date-specific discount on those
     dates (mutual exclusion per item 10). ── */
  const applyRangePrice = async () => {
    const val = Number(rangePrice);
    if (!val || val <= 0 || selectedSet.size === 0) return;
    setSaving(true);
    try {
      const datePricing = Array.from(selectedSet).map((date) => ({
        date,
        price: val,
        isBlocked: false,
        discountPercent: null,
        discountStackable: false,
      }));
      await unitsApi.updatePricing(unitId, { datePricing });
      toast.success(t.applied[lang]);
      clearSelection();
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  const applyRangeBlock = async (block: boolean) => {
    if (selectedSet.size === 0) return;
    setSaving(true);
    try {
      const datePricing = Array.from(selectedSet).map((date) => ({
        date,
        isBlocked: block,
      }));
      await unitsApi.updatePricing(unitId, { datePricing });
      toast.success(block ? t.priceBlocked[lang] : t.priceUnblocked[lang]);
      clearSelection();
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Save global / weekly / monthly discount — includes stackable flag (PR E) ── */
  const savePricingDiscount = async (
    kind: 'global' | 'weekly' | 'monthly',
    percent: number,
    stackable?: boolean,
  ) => {
    if (isNaN(percent) || percent < 0 || percent > 100) return;
    const pricing: Record<string, number | boolean> = {};
    if (kind === 'global') {
      pricing.discountPercent = percent;
      if (stackable !== undefined) pricing.globalStackable = stackable;
    } else if (kind === 'weekly') {
      pricing.weeklyDiscount = percent;
      if (stackable !== undefined) pricing.weeklyStackable = stackable;
    } else {
      pricing.monthlyDiscount = percent;
      if (stackable !== undefined) pricing.monthlyStackable = stackable;
    }
    const setter = kind === 'global' ? setSavingGlobalDiscount
      : kind === 'weekly' ? setSavingWeeklyDiscount
      : setSavingMonthlyDiscount;
    setter(true);
    try {
      await unitsApi.updatePricing(unitId, { pricing });
      toast.success(t.discountSaved[lang]);
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setter(false);
    }
  };

  // E4 + F: Toggle the stackable flag OR the enabled flag on a discount without
  // changing the percent. `field` picks which flag; `value` is the new value.
  const togglePricingDiscountFlag = async (
    kind: 'global' | 'weekly' | 'monthly',
    field: 'stackable' | 'enabled',
    value: boolean,
  ) => {
    try {
      const pricing: Record<string, boolean> = {};
      if (kind === 'global')  pricing[field === 'stackable' ? 'globalStackable'  : 'globalEnabled']  = value;
      if (kind === 'weekly')  pricing[field === 'stackable' ? 'weeklyStackable'  : 'weeklyEnabled']  = value;
      if (kind === 'monthly') pricing[field === 'stackable' ? 'monthlyStackable' : 'monthlyEnabled'] = value;
      await unitsApi.updatePricing(unitId, { pricing });
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    }
  };

  const applyRangeDiscount = async () => {
    if (selectedSet.size === 0 || rangeDiscountPercent <= 0) return;
    setSaving(true);
    try {
      const dates = Array.from(selectedSet).map((date) => ({
        date,
        // F: setting a discount on a range CLEARS any custom price override
        // on those dates (mutual exclusion per item 10).
        price: null,
        discountPercent: rangeDiscountPercent,
        // PR E: range-applied date discounts carry the stackable flag too.
        discountStackable: rangeDiscountStackable,
      }));
      await unitsApi.updatePricing(unitId, { datePricing: dates });
      toast.success(lang === 'ar' ? 'تم تطبيق الخصم' : 'Discount applied');
      clearSelection();
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── D2: Clear-menu actions scoped to the current selection ── */
  const applyBulkReset = async (kind: 'price' | 'discount' | 'block') => {
    if (selectedSet.size === 0) return;
    setSaving(true);
    try {
      const dates = Array.from(selectedSet);
      let successMsg = '';
      if (kind === 'price') {
        // Clearing price overrides means removing the custom price from each
        // datePricing entry. We fetch the current override to preserve any
        // discount/block state — if those exist we keep the entry but drop
        // the price; if nothing else remains, we remove the entry entirely.
        const updates = dates.map((d) => {
          const existing = datePricingMap.get(d);
          const keepDiscount = existing?.discountPercent && existing.discountPercent > 0;
          const keepBlock = existing?.isBlocked;
          if (keepDiscount || keepBlock) {
            return { date: d, price: undefined as unknown as number, isBlocked: !!keepBlock, discountPercent: keepDiscount ? existing!.discountPercent : undefined };
          }
          return { date: d, remove: true };
        });
        await unitsApi.updatePricing(unitId, { datePricing: updates });
        successMsg = t.pricesCleared[lang];
      } else if (kind === 'discount') {
        const updates = dates.map((d) => {
          const existing = datePricingMap.get(d);
          const keepPrice = existing?.price && existing.price > 0;
          const keepBlock = existing?.isBlocked;
          if (keepPrice || keepBlock) {
            return { date: d, price: keepPrice ? existing!.price : undefined, isBlocked: !!keepBlock, discountPercent: 0 };
          }
          return { date: d, remove: true };
        });
        await unitsApi.updatePricing(unitId, { datePricing: updates });
        successMsg = t.discountsCleared[lang];
      } else {
        // Unblock: flip isBlocked=false on any blocked dates in range.
        const updates = dates.map((d) => ({ date: d, isBlocked: false }));
        await unitsApi.updatePricing(unitId, { datePricing: updates });
        successMsg = t.priceUnblocked[lang];
      }
      toast.success(successMsg);
      clearSelection();
      await fetchUnit();
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  /* ── Discount rule handlers ──
     PR F: always call fetchUnit() after save so the calendar cells (which
     read from unit.discountRules via the shared helper) update immediately. */
  const handleAddDiscountRule = async (type: 'weekday' | 'weekend', percent: number, stackable: boolean) => {
    if (discountRules.some((r) => r.type === type)) {
      toast.error(lang === 'ar' ? 'توجد قاعدة لهذا النوع بالفعل' : 'A rule for this day type already exists');
      return;
    }
    const updated = [...discountRules, { type, percent, stackable, enabled: true }];
    try {
      await unitsApi.update(unitId, { discountRules: updated });
      setDiscountRules(updated);
      await fetchUnit();
      toast.success(lang === 'ar' ? 'تمت إضافة الخصم' : 'Discount added');
    } catch { toast.error(lang === 'ar' ? 'فشل' : 'Failed'); }
  };

  const handleRemoveDiscountRule = async (idx: number) => {
    const updated = discountRules.filter((_, i) => i !== idx);
    try {
      await unitsApi.update(unitId, { discountRules: updated });
      setDiscountRules(updated);
      await fetchUnit();
      toast.success(lang === 'ar' ? 'تم حذف الخصم' : 'Discount removed');
    } catch { toast.error(lang === 'ar' ? 'فشل' : 'Failed'); }
  };

  const handleUpdateDiscountRule = async (idx: number, patch: Partial<{ percent: number; stackable: boolean; enabled: boolean }>) => {
    const updated = discountRules.map((r, i) => i === idx ? { ...r, ...patch } : r);
    try {
      await unitsApi.update(unitId, { discountRules: updated });
      setDiscountRules(updated);
      await fetchUnit();
    } catch { toast.error(lang === 'ar' ? 'فشل' : 'Failed'); }
  };

  /* ── E4: unified Add-Discount handler — routes to the right save path
     based on `type`. Date-specific requires a non-empty selectedSet. ── */
  const handleAddDiscount = async () => {
    if (newDiscountPercent <= 0 || newDiscountPercent > 100) return;
    try {
      if (newDiscountType === 'global') {
        await savePricingDiscount('global', newDiscountPercent, newDiscountStackable);
      } else if (newDiscountType === 'weekly') {
        await savePricingDiscount('weekly', newDiscountPercent, newDiscountStackable);
      } else if (newDiscountType === 'monthly') {
        await savePricingDiscount('monthly', newDiscountPercent, newDiscountStackable);
      } else if (newDiscountType === 'weekday' || newDiscountType === 'weekend') {
        await handleAddDiscountRule(newDiscountType, newDiscountPercent, newDiscountStackable);
      } else if (newDiscountType === 'date') {
        if (selectedSet.size === 0) {
          toast.error(t.dateSelectFirst[lang]);
          return;
        }
        const dates = Array.from(selectedSet).map((date) => ({
          date,
          discountPercent: newDiscountPercent,
          discountStackable: newDiscountStackable,
        }));
        await unitsApi.updatePricing(unitId, { datePricing: dates });
        toast.success(t.discountSaved[lang]);
        clearSelection();
        await fetchUnit();
      }
      setShowAddDiscountDialog(false);
      setNewDiscountPercent(10);
      setNewDiscountStackable(false);
    } catch {
      toast.error(t.error[lang]);
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
    // D6: "hasPriceOverride" is narrower than hasOverride — it specifically
    // means there's a custom price set. Used to decide whether to show the
    // "Also reset price to default" secondary action on a blocked date.
    const hasPriceOverride = !!(override?.price && override.price > 0);
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

    // D4 + PR E + F: use the shared helper so this matches booking-time math.
    // We don't pass a stay length — per-day display only shows discounts that
    // would apply to a single-night stay (global + weekday/weekend + date).
    // `markAppliedDiscounts` tags each with isApplied so the dialog can
    // strike the ones shadowed by stacking rules.
    const rawDiscounts = applicableDiscountsForNight(unit as PricingUnit, date);
    const appliedDiscounts = markAppliedDiscounts(rawDiscounts);
    const effectivePct = effectiveDiscountPercent(rawDiscounts);
    const priceAfter = info.blocked ? 0 : Math.round(info.price * (1 - effectivePct / 100));

    return {
      date, info, isWeekend, hasOverride, hasPriceOverride, source, dateLabel,
      isBlocked: !!override?.isBlocked, bookedInfo,
      appliedDiscounts, effectivePct, priceAfter,
    };
  }, [selectedDate, getDayPrice, datePricingMap, bookedDates, lang, isAr, unit, discountRules]);

  // F: how many selected dates fall outside the currently-visible month.
  const selectionOutOfMonthCount = useMemo(() => {
    if (selectedSet.size === 0) return 0;
    let count = 0;
    for (const key of selectedSet) {
      // Parse "YYYY-MM-DD" without relying on timezone conversion.
      const [y, m] = key.split('-').map(Number);
      if (!(y === currentYear && m - 1 === currentMonth)) count++;
    }
    return count;
  }, [selectedSet, currentYear, currentMonth]);

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
          href={`/listings/${propertyId}/units`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t.back[lang]}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.title[lang]}</h1>
        {/* PR J: property + unit switchers so host can hop between calendars
            without going back to /listings. */}
        <div className="flex flex-wrap items-center gap-2">
          {switcherProperties.length > 0 && (
            <select
              value={propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              aria-label={isAr ? 'اختر العقار' : 'Select property'}
            >
              {switcherProperties.map((p) => (
                <option key={p._id} value={p._id}>
                  {isAr ? (p.titleAr || p.title) : (p.title || p.titleAr)}
                </option>
              ))}
            </select>
          )}
          {switcherUnits.length > 1 && (
            <select
              value={unitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              aria-label={isAr ? 'اختر الوحدة' : 'Select unit'}
            >
              {switcherUnits.map((u) => (
                <option key={u._id} value={u._id}>
                  {(isAr ? (u.nameAr || u.nameEn) : (u.nameEn || u.nameAr)) || (isAr ? 'بدون اسم' : 'Untitled')}
                </option>
              ))}
            </select>
          )}
          {/* If only one unit exists, still show its name as a static label */}
          {switcherUnits.length === 1 && unitName && (
            <span className="text-sm text-gray-500">{unitName}</span>
          )}
        </div>
      </div>

      {/* ── Tab Toggle (4E) ── */}
      <div className="bg-gray-100 rounded-xl p-1 flex gap-0.5 mb-6">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'pricing'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.pricingTab[lang]}
        </button>
        <button
          onClick={() => setActiveTab('discount')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'discount'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.discountTab[lang]}
        </button>
      </div>

      {/* ── Pricing Settings Panel (visible in pricing tab) ── */}
      {activeTab === 'pricing' && (
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
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-900" dir="ltr">
                {weekdayAvg > 0 ? (
                  <>
                    <SarSymbol size={14} /> {weekdayAvg.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">&mdash;</span>
                )}
              </span>
              {weekdayAvg > 0 && <span className="text-xs text-gray-400 font-normal">{t.perNight[lang]}</span>}
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
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-900" dir="ltr">
                {weekendAvg > 0 ? (
                  <>
                    <SarSymbol size={14} /> {weekendAvg.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">&mdash;</span>
                )}
              </span>
              {weekendAvg > 0 && <span className="text-xs text-gray-400 font-normal">{t.perNight[lang]}</span>}
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
                {badge.price > 0 ? badge.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '\u2014'}
              </span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Discount Tab Content — E4: unified list of all discounts ── */}
      {activeTab === 'discount' && (
      <div className="space-y-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-600" />
              <h3 className="text-base font-semibold text-gray-900">{t.discountsTitle[lang]}</h3>
            </div>
            <button
              onClick={() => { setNewDiscountType('global'); setNewDiscountPercent(10); setNewDiscountStackable(false); setShowAddDiscountDialog(true); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t.addDiscount[lang]}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">{t.stackableHint[lang]}</p>

          {/* Build the flat list of all active discounts */}
          {(() => {
            const rows: {
              type: DiscountType;
              percent: number;
              stackable: boolean;
              enabled: boolean;
              condition: string;
              onRemove: () => void;
              onToggleStack: () => void;
              onToggleEnabled: () => void;
            }[] = [];
            const p = unit.pricing || {};
            const isEn = (flag?: boolean) => flag !== false; // default true
            if ((p.discountPercent || 0) > 0) {
              rows.push({
                type: 'global', percent: p.discountPercent || 0,
                stackable: !!p.globalStackable, enabled: isEn(p.globalEnabled),
                condition: t.globalAlways[lang],
                onRemove: () => savePricingDiscount('global', 0),
                onToggleStack: () => togglePricingDiscountFlag('global', 'stackable', !p.globalStackable),
                onToggleEnabled: () => togglePricingDiscountFlag('global', 'enabled', !isEn(p.globalEnabled)),
              });
            }
            if ((p.weeklyDiscount || 0) > 0) {
              rows.push({
                type: 'weekly', percent: p.weeklyDiscount || 0,
                stackable: !!p.weeklyStackable, enabled: isEn(p.weeklyEnabled),
                condition: t.weeklyCondition[lang],
                onRemove: () => savePricingDiscount('weekly', 0),
                onToggleStack: () => togglePricingDiscountFlag('weekly', 'stackable', !p.weeklyStackable),
                onToggleEnabled: () => togglePricingDiscountFlag('weekly', 'enabled', !isEn(p.weeklyEnabled)),
              });
            }
            if ((p.monthlyDiscount || 0) > 0) {
              rows.push({
                type: 'monthly', percent: p.monthlyDiscount || 0,
                stackable: !!p.monthlyStackable, enabled: isEn(p.monthlyEnabled),
                condition: t.monthlyCondition[lang],
                onRemove: () => savePricingDiscount('monthly', 0),
                onToggleStack: () => togglePricingDiscountFlag('monthly', 'stackable', !p.monthlyStackable),
                onToggleEnabled: () => togglePricingDiscountFlag('monthly', 'enabled', !isEn(p.monthlyEnabled)),
              });
            }
            for (let i = 0; i < discountRules.length; i++) {
              const rule = discountRules[i];
              rows.push({
                type: rule.type as 'weekday' | 'weekend',
                percent: rule.percent,
                stackable: !!rule.stackable,
                enabled: isEn(rule.enabled),
                condition: rule.type === 'weekday' ? t.weekdaysCondition[lang] : t.weekendsCondition[lang],
                onRemove: () => handleRemoveDiscountRule(i),
                onToggleStack: () => handleUpdateDiscountRule(i, { stackable: !rule.stackable }),
                onToggleEnabled: () => handleUpdateDiscountRule(i, { enabled: !isEn(rule.enabled) }),
              });
            }
            if (rows.length === 0) {
              return (
                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-lg">
                  {t.noDiscountsYet[lang]}
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {rows.map((row, idx) => {
                  const color = DISCOUNT_COLORS[row.type];
                  const typeLabel = row.type === 'global' ? t.discountGlobal[lang]
                    : row.type === 'weekly' ? t.discountWeekly[lang]
                    : row.type === 'monthly' ? t.discountMonthly[lang]
                    : row.type === 'weekday' ? t.discountWeekday[lang]
                    : row.type === 'weekend' ? t.discountWeekend[lang]
                    : t.discountDate[lang];
                  return (
                    <div
                      key={`${row.type}-${idx}`}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${color.bg} ${color.ring} ${row.enabled ? '' : 'opacity-50'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-3 h-3 rounded-full ${color.dot} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${color.text}`}>{typeLabel}</div>
                          <div className="text-xs text-gray-500 truncate">{row.condition}</div>
                        </div>
                        <div className={`text-sm font-bold ${color.text}`} dir="ltr">-{row.percent}%</div>
                      </div>
                      {/* F: iOS-style on/off switch controls whether the discount
                          actively applies. When off, the whole row dims. */}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t.enabled[lang]}>
                        <button
                          type="button"
                          onClick={row.onToggleEnabled}
                          className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${row.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                          aria-label={t.enabled[lang]}
                        >
                          <span className={`absolute top-0.5 ${row.enabled ? 'end-0.5' : 'start-0.5'} w-3 h-3 rounded-full bg-white shadow transition-all`} />
                        </button>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={row.stackable}
                          onChange={row.onToggleStack}
                          className="w-3.5 h-3.5 accent-primary-600 cursor-pointer"
                        />
                        <span className="text-xs text-gray-600">{t.stackable[lang]}</span>
                      </label>
                      <button
                        onClick={row.onRemove}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={lang === 'ar' ? 'إزالة' : 'Remove'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* ── Calendar Section ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 relative">
        {/* Month navigation + range toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-semibold text-gray-800">
                {isAr ? MONTHS_AR[currentMonth] : MONTHS_EN[currentMonth]} {currentYear}
              </span>
            </div>
            <button
              onClick={() => { setMultiSelectMode(!multiSelectMode); clearSelection(); setSelectedDate(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                multiSelectMode
                  ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title={multiSelectMode ? t.multiSelectHint[lang] : ''}
            >
              <MousePointerSquareDashed className="w-3.5 h-3.5" />
              {multiSelectMode ? t.multiSelect[lang] : t.normalMode[lang]}
            </button>
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
            const isInRange = selectedSet.has(key);
            const isClickable = isCurrentMonth && !isPast;
            const bookedInfo = bookedDates.get(key);
            const isBooked = !!bookedInfo && isCurrentMonth;

            // Build cell classes
            let cellBg = 'bg-white';
            let priceBg = '';

            if (!isCurrentMonth) {
              cellBg = 'bg-gray-50';
            } else if (isInRange && !isBooked) {
              cellBg = 'bg-blue-100';
            } else if (dayInfo.blocked) {
              cellBg = 'bg-red-50';
            } else if (isBooked) {
              if (bookedInfo!.status === 'pending') {
                cellBg = 'bg-yellow-50';
              } else if (bookedInfo!.status === 'confirmed' && new Date(bookedInfo!.checkOut) < new Date()) {
                cellBg = 'bg-gray-100';
              } else {
                cellBg = 'bg-emerald-50';
              }
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
                onPointerDown={(e) => isClickable && handleDayPointerDown(key, e)}
                onPointerEnter={() => isClickable && handleDayPointerEnter(key)}
                style={multiSelectMode && isClickable ? { touchAction: 'none', userSelect: 'none' } : undefined}
                className={`
                  relative min-h-[70px] p-2 ${cellBg}
                  ${isCurrentMonth ? '' : 'opacity-40'}
                  ${isPast && isCurrentMonth ? 'opacity-50' : ''}
                  ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary-300 hover:ring-inset' : ''}
                  ${isToday ? 'ring-2 ring-primary-400 ring-inset z-[1]' : ''}
                  ${isSelected ? 'ring-2 ring-primary-500 ring-inset z-[2] bg-primary-50' : ''}
                  ${isInRange && isCurrentMonth && !isSelected ? 'ring-1 ring-blue-300 ring-inset' : ''}
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
                    <UserCheck className={`w-3 h-3 ${
                      bookedInfo!.status === 'pending' ? 'text-yellow-500' :
                      bookedInfo!.status === 'confirmed' && new Date(bookedInfo!.checkOut) < new Date() ? 'text-gray-400' :
                      'text-emerald-500'
                    }`} />
                  )}
                </div>

                {/* F-item-5: show both original (struck) and discounted price
                    when a discount applies. Per-day preview ignores stay length
                    (weekly/monthly only kick in at booking time). */}
                {(() => {
                  if (!isCurrentMonth || dayInfo.blocked || dayInfo.price <= 0) return null;
                  const applicable = applicableDiscountsForNight(unit as PricingUnit, date);
                  const effective = applicable.length > 0 ? effectiveDiscountPercent(applicable) : 0;
                  const discounted = effective > 0 ? Math.round(dayInfo.price * (1 - effective / 100)) : dayInfo.price;
                  return (
                    <div className={`mt-1 text-xs ${priceBg}`} dir="ltr">
                      {effective > 0 ? (
                        <>
                          <span className="text-gray-400 line-through me-1">
                            <SarSymbol size={8} /> {dayInfo.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-semibold text-gray-900">
                            <SarSymbol size={9} /> {discounted.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </>
                      ) : (
                        <>
                          <SarSymbol size={9} /> {dayInfo.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Discount badge + color dots. Weekly/monthly already excluded
                    by the helper when no stay length is given. */}
                {(() => {
                  if (!isCurrentMonth || dayInfo?.blocked) return null;
                  const applicable = applicableDiscountsForNight(unit as PricingUnit, date);
                  if (applicable.length === 0) return null;
                  const effective = effectiveDiscountPercent(applicable);
                  const tooltip = applicable.map((d) => `${d.type} -${d.percent}%${d.stackable ? ' (stack)' : ''}`).join(' + ');
                  return (
                    <div className="flex items-center justify-between gap-1 mt-0.5" title={tooltip}>
                      <div className="flex items-center gap-0.5">
                        {applicable.slice(0, 3).map((d, i) => (
                          <span key={i} className={`w-1.5 h-1.5 rounded-full ${DISCOUNT_COLORS[d.type].dot}`} />
                        ))}
                        {applicable.length > 3 && (
                          <span className="text-[8px] text-gray-400">+{applicable.length - 3}</span>
                        )}
                      </div>
                      <span className="text-[9px] text-orange-500 font-semibold" dir="ltr">-{effective}%</span>
                    </div>
                  );
                })()}

                {isCurrentMonth && dayInfo.blocked && (
                  <div className="mt-1 text-xs text-red-400 font-medium">
                    {t.blocked[lang]}
                  </div>
                )}

                {isBooked && !dayInfo.blocked && isCurrentMonth && (
                  <div className={`mt-0.5 text-[9px] font-medium truncate ${
                    bookedInfo!.status === 'pending' ? 'text-yellow-600' :
                    bookedInfo!.status === 'confirmed' && new Date(bookedInfo!.checkOut) < new Date() ? 'text-gray-400' :
                    'text-emerald-600'
                  }`}>
                    {bookedInfo!.status === 'pending'
                      ? (isAr ? 'قيد الانتظار' : 'Pending')
                      : bookedInfo!.status === 'confirmed' && new Date(bookedInfo!.checkOut) < new Date()
                        ? (isAr ? 'مكتمل' : 'Completed')
                        : t.bookedDay[lang]}
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
          {isAr ? 'قادم' : 'Upcoming'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-yellow-50 border-yellow-200 inline-block" />
          {isAr ? 'قيد الانتظار' : 'Pending'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-gray-100 border-gray-300 inline-block" />
          {isAr ? 'مكتمل' : 'Completed'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border bg-amber-50 border-amber-200 inline-block" />
          {t.weekendDay[lang]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded ring-2 ring-primary-400 bg-white inline-block" />
          {t.today[lang]}
        </span>
        {selectedSet.size > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border bg-blue-100 border-blue-300 inline-block" />
            {isAr ? 'محدد' : 'Selected'}
          </span>
        )}
      </div>

      {/* ── Selection Action Bar (D1 + D2) ── */}
      {(multiSelectMode || selectedSet.size > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-sm font-medium text-blue-800">
              {selectedSet.size > 0 ? (
                <span className="flex flex-wrap items-center gap-x-2">
                  <span>
                    {selectedSet.size} {selectedSet.size === 1 ? t.day[lang] : t.days[lang]}{' '}
                    {isAr ? 'محدد' : 'selected'}
                  </span>
                  {/* F: hint that some selected dates aren't in the visible month */}
                  {selectionOutOfMonthCount > 0 && (
                    <span className="text-xs text-blue-500">
                      ({selectionOutOfMonthCount} {t.selectedOutOfMonth[lang]})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-blue-600">{t.multiSelectHint[lang]}</span>
              )}
            </div>

            {/* D2: Clear / Reset dropdown (replaces single "Clear" button) */}
            <div className="relative" ref={clearMenuRef}>
              <button
                onClick={() => setShowClearMenu((v) => !v)}
                disabled={selectedSet.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <Eraser className="w-3.5 h-3.5" />
                {t.clearMenu[lang]}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showClearMenu ? 'rotate-180' : ''}`} />
              </button>
              {showClearMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClearMenu(false)} />
                  <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[220px] end-0">
                    <button
                      onClick={() => { clearSelection(); }}
                      className="block w-full px-4 py-2.5 text-sm text-start text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t.clearSelection[lang]}
                    </button>
                    <button
                      onClick={() => { setShowClearMenu(false); applyBulkReset('price'); }}
                      disabled={saving}
                      className="block w-full px-4 py-2.5 text-sm text-start text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 border-t border-gray-100"
                    >
                      {t.clearPriceOvr[lang]}
                    </button>
                    <button
                      onClick={() => { setShowClearMenu(false); applyBulkReset('discount'); }}
                      disabled={saving}
                      className="block w-full px-4 py-2.5 text-sm text-start text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 border-t border-gray-100"
                    >
                      {t.clearDiscountOvr[lang]}
                    </button>
                    <button
                      onClick={() => { setShowClearMenu(false); applyBulkReset('block'); }}
                      disabled={saving}
                      className="block w-full px-4 py-2.5 text-sm text-start text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 border-t border-gray-100"
                    >
                      {t.clearBlock[lang]}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {selectedSet.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Block / Unblock buttons */}
              <button
                onClick={() => applyRangeBlock(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {t.block[lang]}
              </button>
              <button
                onClick={() => applyRangeBlock(false)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                {t.unblock[lang]}
              </button>

              {/* Set Price */}
              <button onClick={() => { setRangePrice(''); setShowRangePriceDialog(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                <DollarSign className="w-3.5 h-3.5" />
                {t.setPrice[lang]}
              </button>

              {/* Set Discount */}
              <button onClick={() => { setRangeDiscountPercent(10); setShowRangeDiscountDialog(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                <Percent className="w-3.5 h-3.5" />
                {t.setDiscount[lang]}
              </button>
            </div>
          )}
        </div>
      )}

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

            {/* D6: For a blocked date, show a SINGLE "Reserved" banner — no
                 duplicate status label in the price row. For other dates, show
                 the normal price row with source. */}
            {selectedDateInfo.isBlocked ? (
              <div className="rounded-lg p-3 mb-4 bg-red-50 border border-red-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-700">{t.blocked[lang]}</span>
              </div>
            ) : (
              <div className={`rounded-lg p-3 mb-4 ${
                selectedDateInfo.info.isOverride ? 'bg-blue-50 border border-blue-100' :
                'bg-gray-50 border border-gray-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{selectedDateInfo.source}</span>
                  <span className="text-sm font-semibold text-gray-900" dir="ltr">
                    <SarSymbol size={12} /> {selectedDateInfo.info.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs text-gray-400 ms-1">{t.perNight[lang]}</span>
                  </span>
                </div>
              </div>
            )}

            {/* D4 + F: Applicable discounts summary (hide for blocked dates).
                F-item-2: discounts shadowed by the stacking rule (lower
                non-stackable losing to a higher non-stackable) are struck
                through so the host can see why only some contribute. */}
            {!selectedDateInfo.isBlocked && (
              <div className="mb-4 rounded-lg border border-gray-100 bg-orange-50/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Percent className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-700">{t.discountsApplied[lang]}</span>
                </div>
                {selectedDateInfo.appliedDiscounts.length === 0 ? (
                  <p className="text-xs text-gray-400">{t.noDiscountForDay[lang]}</p>
                ) : (
                  <>
                    <ul className="space-y-0.5 text-xs">
                      {selectedDateInfo.appliedDiscounts.map((d, i) => {
                        const label = d.type === 'global' ? t.discountGlobal[lang]
                          : d.type === 'weekly' ? t.discountWeekly[lang]
                          : d.type === 'monthly' ? t.discountMonthly[lang]
                          : d.type === 'weekday' ? t.discountWeekday[lang]
                          : d.type === 'weekend' ? t.discountWeekend[lang]
                          : t.discountDate[lang];
                        const color = DISCOUNT_COLORS[d.type];
                        const dim = !d.isApplied;
                        return (
                          <li key={i} className={`flex items-center justify-between ${dim ? 'opacity-40 line-through' : ''}`}>
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                              {label}
                              {d.stackable && (
                                <span className="text-[10px] text-gray-400 no-underline">({t.stackable[lang]})</span>
                              )}
                            </span>
                            <span className={`font-medium ${color.text}`} dir="ltr">-{d.percent}%</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-orange-100">
                      <span className="text-xs text-gray-500">{t.effectivePrice[lang]}</span>
                      <div className="flex items-center gap-2">
                        {selectedDateInfo.effectivePct > 0 && (
                          <span className="text-xs text-gray-400 line-through" dir="ltr">
                            <SarSymbol size={10} /> {selectedDateInfo.info.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-900" dir="ltr">
                          <SarSymbol size={11} /> {selectedDateInfo.priceAfter.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* F-item-3: Set date-specific discount from the dialog */}
            {!selectedDateInfo.isBlocked && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t.discountForDate[lang]}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={singleDiscountInput}
                      onChange={(e) => setSingleDiscountInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveSingleDiscount(); }}
                      placeholder="0"
                      className="w-full px-3 py-2 pe-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                  <button
                    onClick={saveSingleDiscount}
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save[lang]}
                  </button>
                </div>
                <label className="flex items-center gap-1.5 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={singleDiscountStackable}
                    onChange={(e) => setSingleDiscountStackable(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary-600 cursor-pointer"
                  />
                  <span className="text-xs text-gray-600">{t.stackable[lang]}</span>
                </label>
              </div>
            )}

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

            {/* Action buttons — D6 simplifies the blocked state to a single
                primary action + an optional secondary link when there's also
                a custom price override to reset. */}
            <div className="flex flex-col gap-2">
              {selectedDateInfo.isBlocked ? (
                <>
                  <button
                    onClick={() => toggleBlock(false)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    {t.unblock[lang]}
                  </button>
                  {selectedDateInfo.hasPriceOverride && (
                    <button
                      onClick={removeOverride}
                      disabled={saving}
                      className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors disabled:opacity-50"
                    >
                      {t.resetPrice[lang]}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleBlock(true)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {t.block[lang]}
                  </button>
                  {/* For non-blocked dates with an override (custom price or date
                      discount), offer a "Reset to default" action. */}
                  {selectedDateInfo.hasOverride && (
                    <button
                      onClick={removeOverride}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      {t.removeOverride[lang]}
                    </button>
                  )}
                </>
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

      {/* ── Set Price Dialog (Task I) ── */}
      {showRangePriceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setShowRangePriceDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{t.setPrice[lang]}</h3>
              <button onClick={() => setShowRangePriceDialog(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.newPrice[lang]}</label>
            <div className="relative mb-4">
              <input type="number" min="0" value={rangePrice} onChange={e => setRangePrice(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && rangePrice && Number(rangePrice) > 0) { applyRangePrice(); setShowRangePriceDialog(false); }}}
                placeholder="0" autoFocus className="w-full px-3 py-2.5 pe-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400"><SarSymbol size={11} /></span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRangePriceDialog(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{t.cancel[lang]}</button>
              <button onClick={() => { applyRangePrice(); setShowRangePriceDialog(false); }}
                disabled={saving || !rangePrice || Number(rangePrice) <= 0}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors">
                {saving ? '...' : t.save[lang]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── E4: Unified Add-Discount Dialog ── */}
      {showAddDiscountDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setShowAddDiscountDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{t.addDiscount[lang]}</h3>
              <button onClick={() => setShowAddDiscountDialog(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Type picker — grid of 6 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.discountType[lang]}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['global', 'weekly', 'monthly', 'weekday', 'weekend', 'date'] as DiscountType[]).map((type) => {
                  const alreadySet =
                    (type === 'global'  && (unit?.pricing?.discountPercent ?? 0) > 0) ||
                    (type === 'weekly'  && (unit?.pricing?.weeklyDiscount  ?? 0) > 0) ||
                    (type === 'monthly' && (unit?.pricing?.monthlyDiscount ?? 0) > 0) ||
                    ((type === 'weekday' || type === 'weekend') && discountRules.some((r) => r.type === type));
                  const disabledDate = type === 'date' && selectedSet.size === 0;
                  const disabled = alreadySet || disabledDate;
                  const color = DISCOUNT_COLORS[type];
                  const typeLabel = type === 'global' ? t.discountGlobal[lang]
                    : type === 'weekly' ? t.discountWeekly[lang]
                    : type === 'monthly' ? t.discountMonthly[lang]
                    : type === 'weekday' ? t.discountWeekday[lang]
                    : type === 'weekend' ? t.discountWeekend[lang]
                    : t.discountDate[lang];
                  return (
                    <button
                      key={type}
                      onClick={() => !disabled && setNewDiscountType(type)}
                      disabled={disabled}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        newDiscountType === type && !disabled
                          ? `${color.bg} ${color.text} ${color.ring} ring-2`
                          : disabled
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      <span className="flex-1 text-start">{typeLabel}</span>
                      {alreadySet && <span className="text-[9px] text-gray-400">{t.alreadyAdded[lang]}</span>}
                      {disabledDate && <span className="text-[9px] text-gray-400">{t.dateSelectFirst[lang]}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Percent slider + input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.discountPercentLabel[lang]}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0" max="100"
                  value={newDiscountPercent}
                  onChange={(e) => setNewDiscountPercent(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="relative w-20">
                  <input
                    type="number" min="0" max="100"
                    value={newDiscountPercent}
                    onChange={(e) => setNewDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full px-2 py-1.5 pe-7 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <span className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
              </div>
            </div>

            {/* Stackable toggle */}
            <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newDiscountStackable}
                onChange={(e) => setNewDiscountStackable(e.target.checked)}
                className="w-4 h-4 accent-primary-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700">{t.stackable[lang]}</span>
              <span className="text-xs text-gray-400">— {t.stackableHint[lang]}</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddDiscountDialog(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t.cancel[lang]}
              </button>
              <button
                onClick={handleAddDiscount}
                disabled={newDiscountPercent <= 0}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors"
              >
                {t.save[lang]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Range Discount Dialog (Task J) ── */}
      {showRangeDiscountDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setShowRangeDiscountDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{t.setDiscount[lang]}</h3>
              <button onClick={() => setShowRangeDiscountDialog(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.discountPercent[lang]}</label>
            <div className="flex items-center gap-3 mb-4">
              <input type="range" min="0" max="100" value={rangeDiscountPercent} onChange={e => setRangeDiscountPercent(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
              <div className="relative w-20">
                <input type="number" min="0" max="100" value={rangeDiscountPercent} onChange={e => setRangeDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full px-2 py-1.5 pe-7 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                <span className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
            {/* PR E: stackable toggle on the range-applied date-specific discount */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rangeDiscountStackable}
                onChange={(e) => setRangeDiscountStackable(e.target.checked)}
                className="w-4 h-4 accent-primary-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700">{t.stackable[lang]}</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowRangeDiscountDialog(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{t.cancel[lang]}</button>
              <button onClick={() => { applyRangeDiscount(); setShowRangeDiscountDialog(false); }}
                disabled={saving || rangeDiscountPercent <= 0}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors">
                {saving ? '...' : t.save[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
