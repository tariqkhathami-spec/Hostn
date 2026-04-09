'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, uploadApi } from '@/lib/api';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { getAmenityLabel, getAmenityIcon } from '@/lib/utils';
import { Loader2, ArrowLeft, X, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Edit Listing', ar: 'تعديل الإعلان' },
  propertyTitle: { en: 'Title', ar: 'العنوان' },
  description: { en: 'Description', ar: 'الوصف' },
  type: { en: 'Property Type', ar: 'نوع العقار' },
  city: { en: 'City', ar: 'المدينة' },
  district: { en: 'District / Neighborhood', ar: 'الحي / المنطقة' },
  price: { en: 'Price per Night (SAR)', ar: 'السعر لليلة (ر.س)' },
  cleaningFee: { en: 'Cleaning Fee (SAR)', ar: 'رسوم التنظيف (ر.س)' },
  discount: { en: 'Discount %', ar: 'نسبة الخصم %' },
  bedrooms: { en: 'Bedrooms', ar: 'غرف النوم' },
  bathrooms: { en: 'Bathrooms', ar: 'الحمامات' },
  guests: { en: 'Max Guests', ar: 'أقصى عدد ضيوف' },
  amenities: { en: 'Amenities', ar: 'المرافق' },
  images: { en: 'Photos', ar: 'الصور' },
  checkIn: { en: 'Check-in Time', ar: 'وقت الدخول' },
  checkOut: { en: 'Check-out Time', ar: 'وقت الخروج' },
  minNights: { en: 'Min Nights', ar: 'أقل عدد ليالي' },
  maxNights: { en: 'Max Nights', ar: 'أقصى عدد ليالي' },
  rules: { en: 'House Rules', ar: 'قواعد المكان' },
  save: { en: 'Save Changes', ar: 'حفظ التغييرات' },
  saving: { en: 'Saving...', ar: 'جاري الحفظ...' },
  success: { en: 'Property updated successfully!', ar: 'تم تحديث العقار بنجاح!' },
  error: { en: 'Failed to update property', ar: 'فشل في تحديث العقار' },
  loadError: { en: 'Failed to load property', ar: 'فشل في تحميل العقار' },
  back: { en: 'Back to Listings', ar: 'العودة للعقارات' },
  selectType: { en: 'Select type', ar: 'اختر النوع' },
  uploadHint: { en: 'Upload up to 10 photos', ar: 'ارفع حتى 10 صور' },
  uploading: { en: 'Uploading...', ar: 'جاري الرفع...' },
  smoking: { en: 'Smoking Allowed', ar: 'يسمح بالتدخين' },
  pets: { en: 'Pets Allowed', ar: 'يسمح بالحيوانات' },
  parties: { en: 'Parties Allowed', ar: 'يسمح بالحفلات' },
  pricing: { en: 'Pricing', ar: 'التسعير' },
  location: { en: 'Location', ar: 'الموقع' },
  capacity: { en: 'Capacity', ar: 'السعة' },
};

const propertyTypes = [
  { value: 'apartment', en: 'Apartment', ar: 'شقة' },
  { value: 'villa', en: 'Villa', ar: 'فيلا' },
  { value: 'chalet', en: 'Chalet', ar: 'شاليه' },
  { value: 'studio', en: 'Studio', ar: 'استوديو' },
  { value: 'farm', en: 'Farm', ar: 'مزرعة' },
  { value: 'camp', en: 'Camp', ar: 'مخيم' },
  { value: 'hotel', en: 'Hotel Room', ar: 'غرفة فندقية' },
];

const ALL_AMENITIES = [
  'wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'washer', 'dryer',
  'gym', 'bbq', 'garden', 'balcony', 'sea_view', 'mountain_view',
  'elevator', 'security', 'pet_friendly', 'smoking_allowed',
  'breakfast_included', 'heating', 'beach_access', 'fireplace', 'hot_tub',
];

const TIME_OPTIONS = [
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  '08:00', '09:00', '10:00', '11:00',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    city: '',
    district: '',
    price: '',
    cleaningFee: '0',
    discountPercent: '0',
    bedrooms: '1',
    bathrooms: '1',
    maxGuests: '2',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    minNights: '1',
    maxNights: '30',
    smokingAllowed: false,
    petsAllowed: false,
    partiesAllowed: false,
  });

  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<{ url: string; isPrimary: boolean }[]>([]);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    try {
      const res = await propertiesApi.getOne(id);
      const p = res.data.data || res.data;

      // Match city value to CITIES constant
      const rawCity = p.location?.city || '';
      const matchedCity = CITIES.find(
        (c) => c.value.toLowerCase() === rawCity.toLowerCase() || c.en.toLowerCase() === rawCity.toLowerCase() || c.ar === rawCity
      );

      // Match district value
      const rawDistrict = p.location?.district || '';
      const cityKey = matchedCity ? matchedCity.value : rawCity;
      const cityDistricts = DISTRICTS[cityKey] || [];
      const matchedDistrict = cityDistricts.find(
        (d) => d.value.toLowerCase() === rawDistrict.toLowerCase() || d.en.toLowerCase() === rawDistrict.toLowerCase() || d.ar === rawDistrict
      );

      setForm({
        title: p.title || '',
        description: p.description || '',
        type: p.type || '',
        city: cityKey,
        district: matchedDistrict ? matchedDistrict.value : rawDistrict,
        price: String(p.pricing?.perNight || ''),
        cleaningFee: String(p.pricing?.cleaningFee || 0),
        discountPercent: String(p.pricing?.discountPercent || 0),
        bedrooms: String(p.capacity?.bedrooms || 1),
        bathrooms: String(p.capacity?.bathrooms || 1),
        maxGuests: String(p.capacity?.maxGuests || 2),
        checkInTime: p.rules?.checkInTime || '15:00',
        checkOutTime: p.rules?.checkOutTime || '11:00',
        minNights: String(p.rules?.minNights || 1),
        maxNights: String(p.rules?.maxNights || 30),
        smokingAllowed: p.rules?.smokingAllowed || false,
        petsAllowed: p.rules?.petsAllowed || false,
        partiesAllowed: p.rules?.partiesAllowed || false,
      });

      setAmenities(p.amenities || []);
      setImages(
        (p.images || []).map((img: { url: string; isPrimary?: boolean }) => ({
          url: img.url,
          isPrimary: img.isPrimary || false,
        }))
      );
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

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 10 - images.length;
    if (remaining <= 0) {
      toast.error(lang === 'ar' ? 'الحد الأقصى 10 صور' : 'Maximum 10 images');
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);

    // Client-side type validation
    const invalid = toUpload.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (invalid.length > 0) {
      toast.error(lang === 'ar' ? 'يُقبل فقط صور JPG و PNG' : 'Only JPG and PNG images are accepted');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await uploadApi.single(fd);
        const url = res.data?.data?.url || res.data?.url;
        if (url) {
          setImages((prev) => [...prev, { url, isPrimary: prev.length === 0 }]);
        }
      }
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (errMsg) {
        toast.error(errMsg);
      } else {
        toast.error(lang === 'ar' ? 'فشل رفع الصورة. تأكد أن الملف صورة (JPG, PNG) وأقل من 5MB' : 'Failed to upload image. Ensure file is an image (JPG, PNG) under 5MB');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Ensure first image is primary
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const setPrimaryImage = (idx: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === idx }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Field-specific validation
    const missing: string[] = [];
    if (!form.title) missing.push(lang === 'ar' ? 'العنوان' : 'Title');
    if (!form.type) missing.push(lang === 'ar' ? 'نوع العقار' : 'Property Type');
    if (!form.city) missing.push(lang === 'ar' ? 'المدينة' : 'City');
    if (!form.price || Number(form.price) <= 0) missing.push(lang === 'ar' ? 'السعر لليلة' : 'Price per Night');
    if (missing.length > 0) {
      toast.error(lang === 'ar'
        ? `الحقول المطلوبة: ${missing.join('، ')}`
        : `Required fields: ${missing.join(', ')}`);
      return;
    }
    if (images.length === 0) {
      toast.error(lang === 'ar' ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo');
      return;
    }
    setSubmitting(true);
    try {
      await propertiesApi.update(id, {
        title: form.title,
        description: form.description,
        type: form.type,
        location: {
          city: form.city,
          ...(form.district && { district: form.district }),
        },
        images,
        amenities,
        pricing: {
          perNight: Number(form.price),
          cleaningFee: Number(form.cleaningFee) || 0,
          discountPercent: Number(form.discountPercent) || 0,
        },
        capacity: {
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          maxGuests: Number(form.maxGuests),
          beds: Number(form.bedrooms),
        },
        rules: {
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          minNights: Number(form.minNights),
          maxNights: Number(form.maxNights),
          smokingAllowed: form.smokingAllowed,
          petsAllowed: form.petsAllowed,
          partiesAllowed: form.partiesAllowed,
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
  const sectionTitle = 'text-base font-semibold text-gray-900 mb-3';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/host/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.back[lang]}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.propertyTitle[lang]} *</label>
            <input name="title" value={form.title} onChange={handleChange} required className={inputClass}
              placeholder={lang === 'ar' ? 'مثل: شاليه فاخر على البحر' : 'e.g. Luxury Beachfront Chalet'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description[lang]}</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass}
              placeholder={lang === 'ar' ? 'صف عقارك بالتفصيل...' : 'Describe your property in detail...'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.city[lang]} *</label>
              <select name="city" value={form.city} onChange={handleChange} required className={inputClass}>
                <option value="">{lang === 'ar' ? 'اختر المدينة' : 'Select city'}</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{lang === 'ar' ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.district[lang]}</label>
            {form.city && DISTRICTS[form.city]?.length > 0 ? (
              <select name="district" value={form.district} onChange={handleChange} className={inputClass}>
                <option value="">{lang === 'ar' ? 'اختر الحي' : 'Select district'}</option>
                {DISTRICTS[form.city].map((d) => (
                  <option key={d.value} value={d.value}>{lang === 'ar' ? d.ar : d.en}</option>
                ))}
              </select>
            ) : (
              <input name="district" value={form.district} onChange={handleChange} className={inputClass}
                placeholder={form.city ? (lang === 'ar' ? 'أدخل اسم الحي' : 'Enter district name') : (lang === 'ar' ? 'اختر المدينة أولاً' : 'Select a city first')}
                disabled={!form.city} />
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className={sectionTitle}>{t.images[lang]}</h2>
          <p className="text-xs text-gray-500 mb-3">{t.uploadHint[lang]}</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                {img.isPrimary && (
                  <span className="absolute top-1.5 start-1.5 text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded font-medium">
                    {lang === 'ar' ? 'رئيسية' : 'Main'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                  {!img.isPrimary && (
                    <button type="button" onClick={() => setPrimaryImage(idx)}
                      className="p-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100">
                      {lang === 'ar' ? 'رئيسية' : 'Main'}
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(idx)}
                    className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {images.length < 10 && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                <span className="text-[10px]">{uploading ? t.uploading[lang] : (lang === 'ar' ? 'إضافة' : 'Add')}</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className={sectionTitle}>{t.pricing[lang]}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.price[lang]} *</label>
              <input name="price" type="number" min="1" value={form.price} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.cleaningFee[lang]}</label>
              <input name="cleaningFee" type="number" min="0" value={form.cleaningFee} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.discount[lang]}</label>
              <input name="discountPercent" type="number" min="0" max="90" value={form.discountPercent} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className={sectionTitle}>{t.capacity[lang]}</h2>
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
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className={sectionTitle}>{t.amenities[lang]}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_AMENITIES.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-start ${
                  amenities.includes(amenity)
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>{getAmenityIcon(amenity)}</span>
                <span>{getAmenityLabel(amenity, lang)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rules & Times */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className={sectionTitle}>{t.rules[lang]}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.checkIn[lang]}</label>
              <select name="checkInTime" value={form.checkInTime} onChange={handleChange} className={inputClass}>
                {TIME_OPTIONS.map((time) => (
                  <option key={`in-${time}`} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.checkOut[lang]}</label>
              <select name="checkOutTime" value={form.checkOutTime} onChange={handleChange} className={inputClass}>
                {TIME_OPTIONS.map((time) => (
                  <option key={`out-${time}`} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.minNights[lang]}</label>
              <input name="minNights" type="number" min="1" value={form.minNights} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.maxNights[lang]}</label>
              <input name="maxNights" type="number" min="1" value={form.maxNights} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { key: 'smokingAllowed', label: t.smoking[lang] },
              { key: 'petsAllowed', label: t.pets[lang] },
              { key: 'partiesAllowed', label: t.parties[lang] },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {label}
              </label>
            ))}
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
