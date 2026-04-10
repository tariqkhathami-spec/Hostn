'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi, propertiesApi } from '@/lib/api';
import {
  Plus, Loader2, ArrowLeft, Copy,
  ToggleLeft, ToggleRight, Bed, Users, Droplets, Building,
  X, ImageOff, DollarSign, CalendarOff,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import SarSymbol from '@/components/ui/SarSymbol';
import type { Unit } from '@/types';

/* ─── Translations ────────────────────────────────────────────────── */
const t: Record<string, Record<string, string>> = {
  title:        { en: 'Units', ar: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  addNew:       { en: 'Add Unit', ar: '\u0625\u0636\u0627\u0641\u0629 \u0648\u062d\u062f\u0629' },
  back:         { en: 'Back to Listings', ar: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  active:       { en: 'Active', ar: '\u0646\u0634\u0637\u0629' },
  inactive:     { en: 'Inactive', ar: '\u063a\u064a\u0631 \u0646\u0634\u0637\u0629' },
  edit:         { en: 'Edit', ar: '\u062a\u0639\u062f\u064a\u0644' },
  duplicate:    { en: 'Duplicate', ar: '\u0646\u0633\u062e' },
  deactivate:   { en: 'Deactivate', ar: '\u062a\u0639\u0637\u064a\u0644' },
  activate:     { en: 'Activate', ar: '\u062a\u0641\u0639\u064a\u0644' },
  noUnits:      { en: 'No units yet. Add your first unit!', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0623\u0648\u0644 \u0648\u062d\u062f\u0629!' },
  duplicated:   { en: 'Unit duplicated', ar: '\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0648\u062d\u062f\u0629' },
  statusUpdated:{ en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
  deleted:      { en: 'Unit deactivated', ar: '\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0648\u062d\u062f\u0629' },
  guests:       { en: 'Guests', ar: '\u0636\u064a\u0648\u0641' },
  bedrooms:     { en: 'Bedrooms', ar: '\u063a\u0631\u0641 \u0646\u0648\u0645' },
  bathrooms:    { en: 'Bathrooms', ar: '\u062d\u0645\u0627\u0645\u0627\u062a' },
  avgPrice:     { en: 'Avg price', ar: '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0633\u0639\u0631' },
  propertyFor:  { en: 'Units for:', ar: '\u0648\u062d\u062f\u0627\u062a:' },
  confirmDelete:{ en: 'Are you sure you want to deactivate this unit?', ar: 'هل تريد تعطيل هذه الوحدة؟' },
  dupTitle:     { en: 'Duplicate Unit', ar: 'نسخ الوحدة' },
  dupDesc:      { en: 'Select what to exclude from the copy:', ar: 'اختر ما تريد استبعاده من النسخة:' },
  dupImages:    { en: 'Photos', ar: 'الصور' },
  dupPricing:   { en: 'Pricing', ar: 'الأسعار' },
  dupDates:     { en: 'Blocked dates', ar: 'التواريخ المحجوبة' },
  dupConfirm:   { en: 'Duplicate', ar: 'نسخ' },
  cancel:       { en: 'Cancel', ar: 'إلغاء' },
};

export default function UnitsListPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'الوحدات' : 'Units');

  const [units, setUnits] = useState<Unit[]>([]);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [dupDialogId, setDupDialogId] = useState<string | null>(null);
  const [dupExclude, setDupExclude] = useState<Record<string, boolean>>({ images: false, pricing: false, unavailableDates: false });
  const [dupLoading, setDupLoading] = useState(false);

  useEffect(() => { load(); }, [propertyId]);

  const load = async () => {
    try {
      const [unitsRes, propRes] = await Promise.all([
        unitsApi.getManage(propertyId),
        propertiesApi.getOne(propertyId),
      ]);
      setUnits(unitsRes.data.data || []);
      const prop = propRes.data.data || propRes.data;
      setPropertyTitle(prop.title || prop.titleAr || '');
    } catch {
      toast.error(isAr ? 'فشل في تحميل الوحدات' : 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const openDupDialog = (id: string) => {
    setDupExclude({ images: false, pricing: false, unavailableDates: false });
    setDupDialogId(id);
  };

  const confirmDuplicate = async () => {
    if (!dupDialogId) return;
    setDupLoading(true);
    try {
      const exclude = Object.entries(dupExclude).filter(([, v]) => v).map(([k]) => k);
      await unitsApi.duplicate(dupDialogId, exclude.length > 0 ? exclude : undefined);
      toast.success(t.duplicated[lang]);
      setDupDialogId(null);
      load();
    } catch {
      toast.error(isAr ? 'فشل في نسخ الوحدة' : 'Failed to duplicate unit');
    } finally {
      setDupLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await unitsApi.toggle(id);
      setUnits((prev) => prev.map((u) => (u._id === id ? { ...u, isActive: !u.isActive } : u)));
      toast.success(t.statusUpdated[lang]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? 'فشل في تحديث الحالة' : 'Failed to update status'));
    }
  };

  /** Average of 7-day pricing */
  const avgPrice = (pricing?: Record<string, number>) => {
    if (!pricing) return 0;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const prices = days.map((d) => pricing[d] || 0).filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };

  const primaryImage = (unit: Unit) =>
    unit.images?.find((i) => i.isPrimary)?.url || unit.images?.[0]?.url;

  const unitName = (unit: Unit) =>
    (isAr ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr) || (isAr ? 'بدون اسم' : 'Untitled');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Link href="/host/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.back[lang]}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title[lang]}</h1>
          {propertyTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{t.propertyFor[lang]} {propertyTitle}</p>
          )}
        </div>
        <Link
          href={`/host/listings/${propertyId}/units/new`}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t.addNew[lang]}
        </Link>
      </div>

      {/* Units list */}
      {units.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t.noUnits[lang]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div
              key={unit._id}
              className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${
                unit.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="h-36 bg-gray-100 relative">
                {primaryImage(unit) ? (
                  <img src={primaryImage(unit)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <span
                  className={`absolute top-3 end-3 px-2 py-1 rounded-full text-xs font-medium ${
                    unit.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {unit.isActive ? t.active[lang] : t.inactive[lang]}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 truncate">{unitName(unit)}</h3>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {(unit.capacity?.maxGuests ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {unit.capacity!.maxGuests}
                    </span>
                  )}
                  {(unit.bedrooms?.count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5" /> {unit.bedrooms!.count}
                    </span>
                  )}
                  {(unit.bathroomCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5" /> {unit.bathroomCount}
                    </span>
                  )}
                </div>

                {avgPrice(unit.pricing) > 0 && (
                  <p className="text-sm font-bold text-primary-600 mb-3">
                    <span dir="ltr">
                      <SarSymbol /> {avgPrice(unit.pricing).toLocaleString('en')}
                    </span>
                    {' '}/{' '}{isAr ? 'ليلة' : 'night'}{' '}
                    <span className="font-normal text-gray-400 text-xs">({t.avgPrice[lang]})</span>
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/host/listings/${propertyId}/units/${unit._id}/edit`}
                      className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                    >
                      {t.edit[lang]}
                    </Link>
                    <button
                      onClick={() => openDupDialog(unit._id)}
                      className="text-sm text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggle(unit._id)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    {unit.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Duplicate confirmation dialog ───────────────────────── */}
      {dupDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-lg font-bold text-gray-900">{t.dupTitle[lang]}</h3>
              <button onClick={() => setDupDialogId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-500 mb-4">{t.dupDesc[lang]}</p>

              <div className="space-y-2">
                {([
                  { key: 'images', label: t.dupImages[lang], icon: ImageOff },
                  { key: 'pricing', label: t.dupPricing[lang], icon: DollarSign },
                  { key: 'unavailableDates', label: t.dupDates[lang], icon: CalendarOff },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      dupExclude[key]
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dupExclude[key]}
                      onChange={() => setDupExclude((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      dupExclude[key] ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white'
                    }`}>
                      {dupExclude[key] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={() => setDupDialogId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.cancel[lang]}
              </button>
              <button
                onClick={confirmDuplicate}
                disabled={dupLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Copy className="w-4 h-4" />
                {t.dupConfirm[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
