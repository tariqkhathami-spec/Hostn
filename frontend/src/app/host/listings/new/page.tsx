'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, uploadApi } from '@/lib/api';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { getAmenityLabel, getAmenityIcon } from '@/lib/utils';
import { Loader2, ArrowLeft, Upload, X, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Create New Listing', ar: '\u0625\u0646\u0634\u0627\u0621 \u0625\u0639\u0644\u0627\u0646 \u062c\u062f\u064a\u062f' },
  propertyTitle: { en: 'Title', ar: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
  description: { en: 'Description', ar: '\u0627\u0644\u0648\u0635\u0641' },
  type: { en: 'Property Type', ar: '\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631' },
  city: { en: 'City', ar: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629' },
  district: { en: 'District / Neighborhood', ar: '\u0627\u0644\u062d\u064a / \u0627\u0644\u0645\u0646\u0637\u0642\u0629' },
  price: { en: 'Price per Night (SAR)', ar: '\u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u064a\u0644\u0629 (\u0631.\u0633)' },
  cleaningFee: { en: 'Cleaning Fee (SAR)', ar: '\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0646\u0638\u064a\u0641 (\u0631.\u0633)' },
  discount: { en: 'Discount %', ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u062e\u0635\u0645 %' },
  bedrooms: { en: 'Bedrooms', ar: '\u063a\u0631\u0641 \u0627\u0644\u0646\u0648\u0645' },
  bathrooms: { en: 'Bathrooms', ar: '\u0627\u0644\u062d\u0645\u0627\u0645\u0627\u062a' },
  guests: { en: 'Max Guests', ar: '\u0623\u0642\u0635\u0649 \u0639\u062f\u062f \u0636\u064a\u0648\u0641' },
  amenities: { en: 'Amenities', ar: '\u0627\u0644\u0645\u0631\u0627\u0641\u0642' },
  images: { en: 'Photos', ar: '\u0627\u0644\u0635\u0648\u0631' },
  checkIn: { en: 'Check-in Time', ar: '\u0648\u0642\u062a \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out Time', ar: '\u0648\u0642\u062a \u0627\u0644\u062e\u0631\u0648\u062c' },
  minNights: { en: 'Min Nights', ar: '\u0623\u0642\u0644 \u0639\u062f\u062f \u0644\u064a\u0627\u0644\u064a' },
  maxNights: { en: 'Max Nights', ar: '\u0623\u0642\u0635\u0649 \u0639\u062f\u062f \u0644\u064a\u0627\u0644\u064a' },
  rules: { en: 'House Rules', ar: '\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u0645\u0643\u0627\u0646' },
  create: { en: 'Create Listing', ar: '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646' },
  creating: { en: 'Creating...', ar: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...' },
  success: { en: 'Property created successfully!', ar: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631 \u0628\u0646\u062c\u0627\u062d!' },
  error: { en: 'Failed to create property', ar: '\u0641\u0634\u0644 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631' },
  back: { en: 'Back to Listings', ar: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  selectType: { en: 'Select type', ar: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0646\u0648\u0639' },
  uploadHint: { en: 'Upload up to 10 photos', ar: '\u0627\u0631\u0641\u0639 \u062d\u062a\u0649 10 \u0635\u0648\u0631' },
  uploading: { en: 'Uploading...', ar: '\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0641\u0639...' },
  smoking: { en: 'Smoking Allowed', ar: '\u064a\u0633\u0645\u062d \u0628\u0627\u0644\u062a\u062f\u062e\u064a\u0646' },
  pets: { en: 'Pets Allowed', ar: '\u064a\u0633\u0645\u062d \u0628\u0627\u0644\u062d\u064a\u0648\u0627\u0646\u0627\u062a' },
  parties: { en: 'Parties Allowed', ar: '\u064a\u0633\u0645\u062d \u0628\u0627\u0644\u062d\u0641\u0644\u0627\u062a' },
  pricing: { en: 'Pricing', ar: '\u0627\u0644\u062a\u0633\u0639\u064a\u0631' },
  location: { en: 'Location', ar: '\u0627\u0644\u0645\u0648\u0642\u0639' },
  capacity: { en: 'Capacity', ar: '\u0627\u0644\u0633\u0639\u0629' },
};

const propertyTypes = [
  { value: 'apartment', en: 'Apartment', ar: '\u0634\u0642\u0629' },
  { value: 'villa', en: 'Villa', ar: '\u0641\u064a\u0644\u0627' },
  { value: 'chalet', en: 'Chalet', ar: '\u0634\u0627\u0644\u064a\u0647' },
  { value: 'studio', en: 'Studio', ar: '\u0627\u0633\u062a\u0648\u062f\u064a\u0648' },
  { value: 'farm', en: 'Farm', ar: '\u0645\u0632\u0631\u0639\u0629' },
  { value: 'camp', en: 'Camp', ar: '\u0645\u062e\u064a\u0645' },
  { value: 'hotel', en: 'Hotel Room', ar: '\u063a\u0631\u0641\u0629 \u0641\u0646\u062f\u0642\u064a\u0629' },
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

export default function NewListingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'إضافة عقار' : 'Add Listing');
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
      toast.error(lang === 'ar' ? '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 10 \u0635\u0648\u0631' : 'Maximum 10 images');
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);

    // Client-side type validation
    const invalid = toUpload.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (invalid.length > 0) {
      toast.error(lang === 'ar' ? '\u064A\u064F\u0642\u0628\u0644 \u0641\u0642\u0637 \u0635\u0648\u0631 JPG \u0648 PNG' : 'Only JPG and PNG images are accepted');
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
        toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629. \u062A\u0623\u0643\u062F \u0623\u0646 \u0627\u0644\u0645\u0644\u0641 \u0635\u0648\u0631\u0629 (JPG, PNG) \u0648\u0623\u0642\u0644 \u0645\u0646 5MB' : 'Failed to upload image. Ensure file is an image (JPG, PNG) under 5MB');
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
      await propertiesApi.create({
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
        // Mongoose validation errors — show first field error
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
              placeholder={lang === 'ar' ? '\u0645\u062b\u0644: \u0634\u0627\u0644\u064a\u0647 \u0641\u0627\u062e\u0631 \u0639\u0644\u0649 \u0627\u0644\u0628\u062d\u0631' : 'e.g. Luxury Beachfront Chalet'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description[lang]}</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass}
              placeholder={lang === 'ar' ? '\u0635\u0641 \u0639\u0642\u0627\u0631\u0643 \u0628\u0627\u0644\u062a\u0641\u0635\u064a\u0644...' : 'Describe your property in detail...'} />
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
                <option value="">{lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062f\u064a\u0646\u0629' : 'Select city'}</option>
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
                    {lang === 'ar' ? '\u0631\u0626\u064a\u0633\u064a\u0629' : 'Main'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                  {!img.isPrimary && (
                    <button type="button" onClick={() => setPrimaryImage(idx)}
                      className="p-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100">
                      {lang === 'ar' ? '\u0631\u0626\u064a\u0633\u064a\u0629' : 'Main'}
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
                <span className="text-[10px]">{uploading ? t.uploading[lang] : (lang === 'ar' ? '\u0625\u0636\u0627\u0641\u0629' : 'Add')}</span>
              </button>
            )}
          </div>

          {images.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setImages([
                  { url: 'https://cdn.oxfordski.com/media/75861/luxury-ski-chalet-chamonix-chalet-freya-oxford-ski-lounge-2.jpg', isPrimary: true },
                  { url: 'https://cdn.oxfordski.com/media/75845/luxury-ski-chalet-chamonix-chalet-freya-oxford-ski-lounge-3.jpg', isPrimary: false },
                  { url: 'https://cdn.oxfordski.com/media/75860/luxury-ski-chalet-chamonix-chalet-freya-oxford-ski-lounge-1.jpg', isPrimary: false },
                  { url: 'https://cdn.oxfordski.com/media/75849/luxury-ski-chalet-chamonix-chalet-freya-oxford-ski-sitting-area.jpg', isPrimary: false },
                ]);
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
            >
              {lang === 'ar' ? 'استخدم صور تجريبية' : 'Use test images'}
            </button>
          )}

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
          {submitting ? t.creating[lang] : t.create[lang]}
        </button>
      </form>
    </div>
  );
}
