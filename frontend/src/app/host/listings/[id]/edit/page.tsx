'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  title:     { en: 'Edit Property', ar: 'تعديل العقار' },
  nameEn:    { en: 'Property Name (English)', ar: 'اسم العقار (الإنجليزية)' },
  nameAr:    { en: 'Property Name (Arabic)', ar: 'اسم العقار (العربية)' },
  type:      { en: 'Property Type', ar: 'نوع العقار' },
  selectType:{ en: 'Select type', ar: 'اختر النوع' },
  direction: { en: 'Direction', ar: 'الاتجاه' },
  selectDir: { en: 'Select direction', ar: 'اختر الاتجاه' },
  location:  { en: 'Location', ar: 'الموقع' },
  city:      { en: 'City', ar: 'المدينة' },
  district:  { en: 'District / Neighborhood', ar: 'الحي / المنطقة' },
  address:   { en: 'Address', ar: 'العنوان' },
  map:       { en: 'Pin Location on Map', ar: 'حدد الموقع على الخريطة' },
  save:      { en: 'Save Changes', ar: 'حفظ التغييرات' },
  saving:    { en: 'Saving...', ar: 'جاري الحفظ...' },
  success:   { en: 'Property updated successfully!', ar: 'تم تحديث العقار بنجاح!' },
  error:     { en: 'Failed to update property', ar: 'فشل في تحديث العقار' },
  loadError: { en: 'Failed to load property', ar: 'فشل في تحميل العقار' },
  back:      { en: 'Back to Listings', ar: 'العودة للعقارات' },
};

const propertyTypes = [
  { value: 'apartment', en: 'Apartment', ar: 'شقة' },
  { value: 'villa', en: 'Villa', ar: 'فيلا' },
  { value: 'chalet', en: 'Chalet', ar: 'شاليه' },
  { value: 'studio', en: 'Studio', ar: 'استوديو' },
  { value: 'farm', en: 'Farm', ar: 'مزرعة' },
  { value: 'camp', en: 'Camp', ar: 'مخيم' },
  { value: 'hotel', en: 'Hotel', ar: 'فندق' },
];

const DIRECTIONS = [
  { value: 'north', en: 'North', ar: 'شمال' },
  { value: 'south', en: 'South', ar: 'جنوب' },
  { value: 'east', en: 'East', ar: 'شرق' },
  { value: 'west', en: 'West', ar: 'غرب' },
  { value: 'northeast', en: 'Northeast', ar: 'شمال شرقي' },
  { value: 'northwest', en: 'Northwest', ar: 'شمال غربي' },
  { value: 'southeast', en: 'Southeast', ar: 'جنوب شرقي' },
  { value: 'southwest', en: 'Southwest', ar: 'جنوب غربي' },
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'تعديل العقار' : 'Edit Property');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    titleAr: '',
    type: '',
    direction: '',
    city: '',
    district: '',
    address: '',
  });

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => { loadProperty(); }, [id]);

  const loadProperty = async () => {
    try {
      const res = await propertiesApi.getOne(id);
      const p = res.data.data || res.data;

      const rawCity = p.location?.city || '';
      const matchedCity = CITIES.find(
        (c) => c.value.toLowerCase() === rawCity.toLowerCase() || c.en.toLowerCase() === rawCity.toLowerCase() || c.ar === rawCity
      );
      const cityKey = matchedCity ? matchedCity.value : rawCity;

      const rawDistrict = p.location?.district || '';
      const cityDistricts = DISTRICTS[cityKey] || [];
      const matchedDistrict = cityDistricts.find(
        (d) => d.value.toLowerCase() === rawDistrict.toLowerCase() || d.en.toLowerCase() === rawDistrict.toLowerCase() || d.ar === rawDistrict
      );

      setForm({
        title: p.title || '',
        titleAr: p.titleAr || '',
        type: p.type || '',
        direction: p.direction || '',
        city: cityKey,
        district: matchedDistrict ? matchedDistrict.value : rawDistrict,
        address: p.location?.address || '',
      });

      if (p.location?.coordinates?.lat && p.location?.coordinates?.lng) {
        setCoordinates({ lat: p.location.coordinates.lat, lng: p.location.coordinates.lng });
      }
    } catch {
      toast.error(t.loadError[lang]);
    } finally {
      setLoading(false);
    }
  };

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
    if (!form.title) missing.push(isAr ? 'الاسم' : 'Name');
    if (!form.type) missing.push(isAr ? 'نوع العقار' : 'Property Type');
    if (!form.city) missing.push(isAr ? 'المدينة' : 'City');
    if (missing.length > 0) {
      toast.error(isAr
        ? `الحقول المطلوبة: ${missing.join('، ')}`
        : `Required fields: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      await propertiesApi.update(id, {
        title: form.title,
        titleAr: form.titleAr || undefined,
        type: form.type,
        ...(form.direction && { direction: form.direction }),
        location: {
          city: form.city,
          ...(form.district && { district: form.district }),
          ...(form.address && { address: form.address }),
          ...(coordinates && { coordinates }),
        },
      });
      toast.success(t.success[lang]);
      router.push('/host/listings');
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name + Type + Direction */}
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
                placeholder="مثال: منتجع شاطئ الغروب" dir="rtl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.type[lang]} *</label>
              <select name="type" value={form.type} onChange={handleChange} required className={inputClass}>
                <option value="">{t.selectType[lang]}</option>
                {propertyTypes.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt[lang]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.direction[lang]}</label>
              <select name="direction" value={form.direction} onChange={handleChange} className={inputClass}>
                <option value="">{t.selectDir[lang]}</option>
                {DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d[lang]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{t.location[lang]}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.city[lang]} *</label>
              <select name="city" value={form.city} onChange={handleChange} required className={inputClass}>
                <option value="">{isAr ? 'اختر المدينة' : 'Select city'}</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.district[lang]}</label>
              {form.city && DISTRICTS[form.city]?.length > 0 ? (
                <select name="district" value={form.district} onChange={handleChange} className={inputClass}>
                  <option value="">{isAr ? 'اختر الحي' : 'Select district'}</option>
                  {DISTRICTS[form.city].map((d) => (
                    <option key={d.value} value={d.value}>{isAr ? d.ar : d.en}</option>
                  ))}
                </select>
              ) : (
                <input name="district" value={form.district} onChange={handleChange} className={inputClass}
                  placeholder={form.city ? (isAr ? 'أدخل اسم الحي' : 'Enter district name') : (isAr ? 'اختر المدينة أولاً' : 'Select a city first')}
                  disabled={!form.city} />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.address[lang]}</label>
            <input name="address" value={form.address} onChange={handleChange} className={inputClass}
              placeholder={isAr ? 'العنوان التفصيلي' : 'Full address'} />
          </div>

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
          {submitting ? t.saving[lang] : t.save[lang]}
        </button>
      </form>
    </div>
  );
}
