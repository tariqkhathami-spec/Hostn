'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { CITIES } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Edit Listing', ar: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0625\u0639\u0644\u0627\u0646' },
  propertyTitle: { en: 'Title', ar: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
  description: { en: 'Description', ar: '\u0627\u0644\u0648\u0635\u0641' },
  type: { en: 'Property Type', ar: '\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631' },
  city: { en: 'City', ar: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629' },
  price: { en: 'Price per Night (SAR)', ar: '\u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u064a\u0644\u0629 (\u0631.\u0633)' },
  bedrooms: { en: 'Bedrooms', ar: '\u063a\u0631\u0641 \u0627\u0644\u0646\u0648\u0645' },
  bathrooms: { en: 'Bathrooms', ar: '\u0627\u0644\u062d\u0645\u0627\u0645\u0627\u062a' },
  guests: { en: 'Max Guests', ar: '\u0623\u0642\u0635\u0649 \u0639\u062f\u062f \u0636\u064a\u0648\u0641' },
  save: { en: 'Save Changes', ar: '\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a' },
  saving: { en: 'Saving...', ar: '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638...' },
  success: { en: 'Property updated successfully!', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0639\u0642\u0627\u0631 \u0628\u0646\u062c\u0627\u062d!' },
  error: { en: 'Failed to update property', ar: '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0639\u0642\u0627\u0631' },
  loadError: { en: 'Failed to load property', ar: '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631' },
  back: { en: 'Back to Listings', ar: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  selectType: { en: 'Select type', ar: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0648\u0639' },
};

const propertyTypes = [
  { value: 'apartment', en: 'Apartment', ar: '\u0634\u0642\u0629' },
  { value: 'villa', en: 'Villa', ar: '\u0641\u064a\u0644\u0627' },
  { value: 'chalet', en: 'Chalet', ar: '\u0634\u0627\u0644\u064a\u0647' },
  { value: 'studio', en: 'Studio', ar: '\u0627\u0633\u062a\u0648\u062f\u064a\u0648' },
  { value: 'farm', en: 'Farm', ar: '\u0645\u0632\u0631\u0639\u0629' },
  { value: 'camp', en: 'Camp', ar: '\u0645\u062e\u064a\u0645' },
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'تعديل العقار' : 'Edit Listing');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    city: '',
    price: '',
    bedrooms: '1',
    bathrooms: '1',
    maxGuests: '2',
  });

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    try {
      const res = await propertiesApi.getOne(id);
      const p = res.data.data || res.data;
      // Match city value to CITIES constant (case-insensitive + Arabic support)
      const rawCity = p.location?.city || p.city || '';
      const matchedCity = CITIES.find(
        (c) => c.value.toLowerCase() === rawCity.toLowerCase() || c.en.toLowerCase() === rawCity.toLowerCase() || c.ar === rawCity
      );
      setForm({
        title: p.title || '',
        description: p.description || '',
        type: p.type || '',
        city: matchedCity ? matchedCity.value : rawCity,
        price: String(p.pricing?.perNight || p.price || ''),
        bedrooms: String(p.capacity?.bedrooms || p.bedrooms || 1),
        bathrooms: String(p.capacity?.bathrooms || p.bathrooms || 1),
        maxGuests: String(p.capacity?.maxGuests || p.maxGuests || 2),
      });
    } catch {
      toast.error(t.loadError[lang]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await propertiesApi.update(id, {
        title: form.title,
        description: form.description,
        type: form.type,
        city: form.city,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        maxGuests: Number(form.maxGuests),
      });
      toast.success(t.success[lang]);
      router.push('/host/listings');
    } catch {
      toast.error(t.error[lang]);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/host/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.back[lang]}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.propertyTitle[lang]}</label>
          <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.description[lang]}</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.type[lang]}</label>
            <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
              <option value="">{t.selectType[lang]}</option>
              {propertyTypes.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt[lang]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.city[lang]}</label>
            <select name="city" value={form.city} onChange={handleChange} required className={inputClass}>
              <option value="">{lang === 'ar' ? 'اختر المدينة' : 'Select city'}</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>{lang === 'ar' ? c.ar : c.en}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.price[lang]}</label>
          <input name="price" type="number" min="1" value={form.price} onChange={handleChange} required className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.bedrooms[lang]}</label>
            <input name="bedrooms" type="number" min="0" value={form.bedrooms} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.bathrooms[lang]}</label>
            <input name="bathrooms" type="number" min="0" value={form.bathrooms} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.guests[lang]}</label>
            <input name="maxGuests" type="number" min="1" value={form.maxGuests} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? t.saving[lang] : t.save[lang]}
        </button>
      </form>
    </div>
  );
}
