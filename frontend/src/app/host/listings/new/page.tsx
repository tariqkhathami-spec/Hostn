'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });

const t: Record<string, Record<string, string>> = {
  title: { en: 'Create New Property', ar: '\u0625\u0646\u0634\u0627\u0621 \u0639\u0642\u0627\u0631 \u062c\u062f\u064a\u062f' },
  nameEn: { en: 'Property Name (English)', ar: '\u0627\u0633\u0645 \u0627\u0644\u0639\u0642\u0627\u0631 (\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629)' },
  nameAr: { en: 'Property Name (Arabic)', ar: '\u0627\u0633\u0645 \u0627\u0644\u0639\u0642\u0627\u0631 (\u0627\u0644\u0639\u0631\u0628\u064a\u0629)' },
  type: { en: 'Property Type', ar: '\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631' },
  selectType: { en: 'Select type', ar: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0648\u0639' },
  location: { en: 'Location', ar: '\u0627\u0644\u0645\u0648\u0642\u0639' },
  city: { en: 'City', ar: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629' },
  district: { en: 'District / Neighborhood', ar: '\u0627\u0644\u062d\u064a / \u0627\u0644\u0645\u0646\u0637\u0642\u0629' },
  address: { en: 'Address', ar: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
  map: { en: 'Pin Location on Map', ar: '\u062d\u062f\u062f \u0627\u0644\u0645\u0648\u0642\u0639 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629' },
  create: { en: 'Create Property', ar: '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631' },
  creating: { en: 'Creating...', ar: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...' },
  success: { en: 'Property created! Now add units.', ar: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631! \u0623\u0636\u0641 \u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0622\u0646.' },
  error: { en: 'Failed to create property', ar: '\u0641\u0634\u0644 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631' },
  back: { en: 'Back to Listings', ar: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  hint: { en: 'After creating the property, you can add bookable units (rooms, chalets, etc.)', ar: '\u0628\u0639\u062f \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631\u060c \u064a\u0645\u0643\u0646\u0643 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062d\u062c\u0632 (\u063a\u0631\u0641\u060c \u0634\u0627\u0644\u064a\u0647\u0627\u062a\u060c \u0625\u0644\u062e)' },
};

const propertyTypes = [
  { value: 'apartment', en: 'Apartment', ar: '\u0634\u0642\u0629' },
  { value: 'villa', en: 'Villa', ar: '\u0641\u064a\u0644\u0627' },
  { value: 'chalet', en: 'Chalet', ar: '\u0634\u0627\u0644\u064a\u0647' },
  { value: 'studio', en: 'Studio', ar: '\u0627\u0633\u062a\u0648\u062f\u064a\u0648' },
  { value: 'farm', en: 'Farm', ar: '\u0645\u0632\u0631\u0639\u0629' },
  { value: 'camp', en: 'Camp', ar: '\u0645\u062e\u064a\u0645' },
  { value: 'hotel', en: 'Hotel', ar: '\u0641\u0646\u062f\u0642' },
];

export default function NewListingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u0627\u0631' : 'Add Property');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    titleAr: '',
    type: '',
    city: '',
    district: '',
    address: '',
  });

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      setForm({ ...form, city: value, district: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddressResolved = (addr: { city: string; district: string; address: string }) => {
    setForm(prev => ({
      ...prev,
      ...(addr.address && { address: addr.address }),
      ...(addr.city && !prev.city && { city: addr.city }),
      ...(addr.district && !prev.district && { district: addr.district }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.title) missing.push(isAr ? '\u0627\u0644\u0627\u0633\u0645' : 'Name');
    if (!form.type) missing.push(isAr ? '\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631' : 'Property Type');
    if (!form.city) missing.push(isAr ? '\u0627\u0644\u0645\u062f\u064a\u0646\u0629' : 'City');
    if (missing.length > 0) {
      toast.error(isAr
        ? `\u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: ${missing.join('\u060c ')}`
        : `Required fields: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await propertiesApi.create({
        title: form.title,
        ...(form.titleAr && { titleAr: form.titleAr }),
        type: form.type,
        location: {
          city: form.city,
          ...(form.district && { district: form.district }),
          ...(form.address && { address: form.address }),
          ...(coordinates && { coordinates }),
        },
      });
      toast.success(t.success[lang]);
      // Navigate directly to units page so host can add units
      const propertyId = res.data?.data?._id || res.data?._id;
      router.push(propertyId ? `/host/listings/${propertyId}/units` : '/host/listings');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; errors?: Record<string, { message: string }> } } })?.response?.data;
      if (errData?.errors) {
        const firstError = Object.values(errData.errors)[0]?.message;
        toast.error(firstError || t.error[lang]);
      } else if (errData?.message) {
        toast.error(errData.message);
      } else {
        toast.error(t.error[lang]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 focus:bg-white outline-none text-sm transition-all duration-200';

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/host/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.back[lang]}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title[lang]}</h1>
      <p className="text-sm text-gray-500 mb-6">{t.hint[lang]}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameEn[lang]} *</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass}
                placeholder="e.g. Sunset Beach Resort" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameAr[lang]}</label>
              <input name="titleAr" value={form.titleAr} onChange={handleChange} className={inputClass}
                placeholder="\u0645\u062b\u0644: \u0645\u0646\u062a\u062c\u0639 \u0634\u0627\u0637\u0626 \u0627\u0644\u063a\u0631\u0648\u0628" dir="rtl" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.type[lang]} *</label>
            <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
              <option value="">{t.selectType[lang]}</option>
              {propertyTypes.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt[lang]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{t.location[lang]}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.city[lang]} *</label>
              <select name="city" value={form.city} onChange={handleChange} required className={inputClass}>
                <option value="">{isAr ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u064a\u0646\u0629' : 'Select city'}</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.district[lang]}</label>
              {form.city && DISTRICTS[form.city]?.length > 0 ? (
                <select name="district" value={form.district} onChange={handleChange} className={inputClass}>
                  <option value="">{isAr ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u062d\u064a' : 'Select district'}</option>
                  {DISTRICTS[form.city].map((d) => (
                    <option key={d.value} value={d.value}>{isAr ? d.ar : d.en}</option>
                  ))}
                </select>
              ) : (
                <input name="district" value={form.district} onChange={handleChange} className={inputClass}
                  placeholder={form.city ? (isAr ? '\u0623\u062f\u062e\u0644 \u0627\u0633\u0645 \u0627\u0644\u062d\u064a' : 'Enter district name') : (isAr ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0623\u0648\u0644\u0627\u064b' : 'Select a city first')}
                  disabled={!form.city} />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.address[lang]}</label>
            <input name="address" value={form.address} onChange={handleChange} className={inputClass}
              placeholder={isAr ? '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a' : 'Full address'} />
          </div>

          {/* Map picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.map[lang]}</label>
            <LocationPicker
              value={coordinates}
              onChange={setCoordinates}
              onAddressResolved={handleAddressResolved}
              className="h-[300px]"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? t.creating[lang] : t.create[lang]}
        </button>
      </form>
    </div>
  );
}
