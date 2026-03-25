'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Property, PropertyType, AmenityType } from '@/types';
import { propertiesApi } from '@/lib/api';
import { getAmenityLabel, getAmenityIcon, formatPrice, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Save,
  ImagePlus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Building2,
  MapPin,
  DollarSign,
  Sparkles,
  Shield,
  Eye,
  Users,
  BedDouble,
  Bath,
  Star,
  GripVertical,
  Upload,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

// ─── Bilingual helpers ──────────────────────────────────────────────
function getPropTypes(isAr: boolean): { label: string; value: PropertyType; icon: string; desc: string }[] {
  return [
    { label: isAr ? 'شاليه' : 'Chalet', value: 'chalet', icon: '🏔️', desc: isAr ? 'استراحة في الطبيعة' : 'Mountain or nature retreat' },
    { label: isAr ? 'شقة' : 'Apartment', value: 'apartment', icon: '🏢', desc: isAr ? 'شقة في المدينة' : 'City or urban flat' },
    { label: isAr ? 'فيلا' : 'Villa', value: 'villa', icon: '🏡', desc: isAr ? 'منزل خاص واسع' : 'Spacious private home' },
    { label: isAr ? 'استوديو' : 'Studio', value: 'studio', icon: '🏠', desc: isAr ? 'وحدة غرفة واحدة' : 'Compact one-room unit' },
    { label: isAr ? 'مزرعة' : 'Farm', value: 'farm', icon: '🌾', desc: isAr ? 'إقامة ريفية' : 'Rural farm stay' },
    { label: isAr ? 'مخيم' : 'Camp', value: 'camp', icon: '⛺', desc: isAr ? 'تخييم أو تخييم فاخر' : 'Camping or glamping site' },
    { label: isAr ? 'غرفة فندقية' : 'Hotel Room', value: 'hotel', icon: '🏨', desc: isAr ? 'إقامة فندقية' : 'Hotel-style accommodation' },
  ];
}

// ─── Constants ──────────────────────────────────────────────────────
const PROPERTY_TYPES: { label: string; value: PropertyType; icon: string; desc: string }[] = [
  { label: 'Chalet', value: 'chalet', icon: '🏔️', desc: 'Mountain or nature retreat' },
  { label: 'Apartment', value: 'apartment', icon: '🏢', desc: 'City or urban flat' },
  { label: 'Villa', value: 'villa', icon: '🏡', desc: 'Spacious private home' },
  { label: 'Studio', value: 'studio', icon: '🏠', desc: 'Compact one-room unit' },
  { label: 'Farm', value: 'farm', icon: '🌾', desc: 'Rural farm stay' },
  { label: 'Camp', value: 'camp', icon: '⛺', desc: 'Camping or glamping site' },
  { label: 'Hotel Room', value: 'hotel', icon: '🏨', desc: 'Hotel-style accommodation' },
];

const CITIES_AR: Record<string, string> = {
  'Riyadh': 'الرياض', 'Jeddah': 'جدة', 'Abha': 'أبها', 'Khobar': 'الخبر',
  'Taif': 'الطائف', 'Al Ula': 'العلا', 'Hail': 'حائل', 'Mecca': 'مكة',
  'Madinah': 'المدينة', 'Dammam': 'الدمام', 'Yanbu': 'ينبع', 'Tabuk': 'تبوك',
};

const CITIES = ['Riyadh', 'Jeddah', 'Abha', 'Khobar', 'Taif', 'Al Ula', 'Hail', 'Mecca', 'Madinah', 'Dammam', 'Yanbu', 'Tabuk'];

const ALL_AMENITIES: AmenityType[] = [
  'wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'washer', 'dryer',
  'gym', 'bbq', 'garden', 'balcony', 'sea_view', 'mountain_view',
  'elevator', 'security', 'pet_friendly', 'smoking_allowed', 'breakfast_included', 'heating',
];

const AMENITY_CATEGORIES = {
  'Essentials': ['wifi', 'ac', 'kitchen', 'tv', 'parking', 'heating'] as AmenityType[],
  'Facilities': ['pool', 'gym', 'bbq', 'garden', 'elevator', 'security'] as AmenityType[],
  'Laundry': ['washer', 'dryer'] as AmenityType[],
  'Views & Outdoor': ['balcony', 'sea_view', 'mountain_view'] as AmenityType[],
  'Guest Policies': ['pet_friendly', 'smoking_allowed', 'breakfast_included'] as AmenityType[],
};

const AMENITY_CATEGORIES_AR: Record<string, string> = {
  'Essentials': 'الأساسيات',
  'Facilities': 'المرافق',
  'Laundry': 'الغسيل',
  'Views & Outdoor': 'الإطلالات والهواء الطلق',
  'Guest Policies': 'سياسات الضيوف',
};

// ─── Step definitions ───────────────────────────────────────────────
function getSteps(isAr: boolean) {
  return [
    { num: 1, label: isAr ? 'نوع العقار' : 'Property Type', desc: isAr ? 'ما نوع العقار؟' : 'What kind of property?', icon: Building2 },
    { num: 2, label: isAr ? 'الموقع' : 'Location', desc: isAr ? 'أين يقع؟' : 'Where is it?', icon: MapPin },
    { num: 3, label: isAr ? 'التفاصيل' : 'Details', desc: isAr ? 'الغرف والسعة' : 'Rooms & capacity', icon: Users },
    { num: 4, label: isAr ? 'التسعير' : 'Pricing', desc: isAr ? 'حدد الأسعار' : 'Set your rates', icon: DollarSign },
    { num: 5, label: isAr ? 'المرافق' : 'Amenities', desc: isAr ? 'ما تقدمه' : 'What you offer', icon: Sparkles },
    { num: 6, label: isAr ? 'الصور' : 'Images', desc: isAr ? 'أظهر عقارك' : 'Show it off', icon: ImagePlus },
    { num: 7, label: isAr ? 'القواعد' : 'Rules', desc: isAr ? 'قواعد المنزل' : 'House rules', icon: Shield },
    { num: 8, label: isAr ? 'المراجعة' : 'Review', desc: isAr ? 'معاينة ونشر' : 'Preview & publish', icon: Eye },
  ];
}

const STEPS = [
  { num: 1, label: 'Property Type', desc: 'What kind of property?', icon: Building2 },
  { num: 2, label: 'Location', desc: 'Where is it?', icon: MapPin },
  { num: 3, label: 'Details', desc: 'Rooms & capacity', icon: Users },   { num: 4, label: 'Pricing', desc: 'Set your rates', icon: DollarSign },
  { num: 5, label: 'Amenities', desc: 'What you offer', icon: Sparkles },
  { num: 6, label: 'Images', desc: 'Show it off', icon: ImagePlus },
  { num: 7, label: 'Rules', desc: 'House rules', icon: Shield },
  { num: 8, label: 'Review', desc: 'Preview & publish', icon: Eye },
];

interface PropertyFormProps {
  initialData?: Property;
  isEditing?: boolean;
}

export default function PropertyForm({ initialData, isEditing = false }: PropertyFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const steps = getSteps(isAr);
  const propTypes = getPropTypes(isAr);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    type: initialData?.type || ('' as PropertyType | ''),
    city: initialData?.location?.city || '',
    district: initialData?.location?.district || '',
    address: initialData?.location?.address || '',
    perNight: initialData?.pricing?.perNight || 0,
    cleaningFee: initialData?.pricing?.cleaningFee || 0,
    discountPercent: initialData?.pricing?.discountPercent || 0,
    weeklyDiscount: initialData?.pricing?.weeklyDiscount || 0,
    maxGuests: initialData?.capacity?.maxGuests || 2,
    bedrooms: initialData?.capacity?.bedrooms || 1,
    bathrooms: initialData?.capacity?.bathrooms || 1,
    beds: initialData?.capacity?.beds || 1,
    amenities: initialData?.amenities || ([] as AmenityType[]),
    images: initialData?.images || ([] as { url: string; caption: string; isPrimary: boolean }[]),
    checkInTime: initialData?.rules?.checkInTime || '14:00',
    checkOutTime: initialData?.rules?.checkOutTime || '12:00',
    minNights: initialData?.rules?.minNights || 1,
    maxNights: initialData?.rules?.maxNights || 30,
    smokingAllowed: initialData?.rules?.smokingAllowed || false,
    petsAllowed: initialData?.rules?.petsAllowed || false,
    partiesAllowed: initialData?.rules?.partiesAllowed || false,
  });

  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const next = { ...e }; delete next[key]; return next; });
  }, []);

  const toggleAmenity = (amenity: AmenityType) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const addImage = () => {
    if (!imageUrl.trim()) return;
    setForm((f) => ({
      ...f,
      images: [...f.images, { url: imageUrl.trim(), caption: '', isPrimary: f.images.length === 0 }],
    }));
    setImageUrl('');
  };

  const removeImage = (index: number) => {
    setForm((f) => {
      const images = f.images.filter((_, i) => i !== index);
      if (images.length > 0 && !images.some((img) => img.isPrimary)) {
        images[0].isPrimary = true;
      }
      return { ...f, images };
    });
  };

  const setPrimaryImage = (index: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploadedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(isAr ? 'نوع ملف غير مدعوم: ' + file.name : 'Unsupported file type: ' + file.name);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isAr ? 'الملف كبير جداً (الحد الأقصى 5MB)' : 'File too large (max 5MB)');
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success && data.url) {
          setForm((f) => ({ ...f, images: [...f.images, { url: data.url, caption: '', isPrimary: f.images.length === 0 }] }));
          uploadedCount++;
        } else {
          toast.error(data.message || 'Upload failed');
        }
      } catch {
        toast.error(isAr ? 'خطأ في رفع الصورة' : 'Error uploading image');
      }
    }
    if (uploadedCount > 0) toast.success(isAr ? 'تم رفع ' + uploadedCount + ' صورة بنجاح' : uploadedCount + ' photo(s) uploaded');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Validation per step ──────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!form.type) errs.type = 'Select a property type';
        if (!form.title.trim()) errs.title = 'Title is required';
        break;
      case 2:
        if (!form.city) errs.city = 'Select a city';
        break;
      case 3:
        if (form.maxGuests < 1) errs.maxGuests = 'At least 1 guest';
        break;
      case 4:
        if (form.perNight <= 0) errs.perNight = 'Price must be greater than 0';
        break;
      case 6:
        if (form.images.length === 0) errs.images = 'Add at least 1 image';
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, steps.length));
    }
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const goToStep = (step: number) => {
    // Only allow jumping to visited or validated steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim() || !form.city || form.perNight <= 0) {
      toast.error('Please complete all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        location: { city: form.city, district: form.district, address: form.address },
        images: form.images,
        amenities: form.amenities,
        pricing: {
          perNight: form.perNight,
          cleaningFee: form.cleaningFee,
          discountPercent: form.discountPercent,
          weeklyDiscount: form.weeklyDiscount,
        },
        capacity: { maxGuests: form.maxGuests, bedrooms: form.bedrooms, bathrooms: form.bathrooms, beds: form.beds },
        rules: {
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          minNights: form.minNights,
          maxNights: form.maxNights,
          smokingAllowed: form.smokingAllowed,
          petsAllowed: form.petsAllowed,
          partiesAllowed: form.partiesAllowed,
        },
      };

      if (isEditing && initialData) {
        await propertiesApi.update(initialData._id, payload);
        toast.success('Property updated!');
      } else {
        await propertiesApi.create(payload);
        toast.success('Property created!');
      }
      router.push('/host/listings');
    } catch (error: unknown) {
      const msg = (error as any)?.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Number stepper helper ────────────────────────────────────────
  const NumberStepper = ({ label, value, min, max, field, icon: Icon }: { label: string; value: number; min: number; max: number; field: string; icon?: React.ElementType }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-gray-400" />}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => update(field, Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-30 transition-colors"
        >
          -
        </button>
        <span className="text-lg font-bold text-gray-900 w-6 text-center">{value}</span>
        <button
          type="button"
          onClick={() => update(field, Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );

  // ─── Toggle helper ────────────────────────────────────────────────
  const ToggleSwitch = ({ label, field, desc }: { label: string; field: string; desc?: string }) => (
    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
      <div>
        <span className="text-sm font-medium text-gray-700 block">{label}</span>
        {desc && <span className="text-xs text-gray-400 mt-0.5 block">{desc}</span>}
      </div>
      <div className="relative">
        <input type="checkbox" checked={(form as any)[field]} onChange={(e) => update(field, e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:bg-primary-600 transition-colors">
          <div className={cn(
            'w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform',
            (form as any)[field] ? 'translate-x-[22px]' : 'translate-x-0.5'
          )} />
        </div>
      </div>
    </label>
  );

  // ─── Completion percentage ────────────────────────────────────────
  const completionPct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className="max-w-4xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">{isAr ? `الخطوة ${currentStep} من ${steps.length}` : `Step ${currentStep} of ${steps.length}`}</span>
          <span className="text-xs font-semibold text-primary-600">{isAr ? `مكتمل ${completionPct}%` : `${completionPct}% complete`}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          return (
            <button
              key={step.num}
              onClick={() => goToStep(step.num)}
              disabled={step.num > currentStep}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0',
                isCurrent && 'bg-primary-50 text-primary-700 ring-1 ring-primary-200',
                isCompleted && 'text-green-700 hover:bg-green-50 cursor-pointer',
                !isCurrent && !isCompleted && 'text-gray-400 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                isCurrent && 'bg-primary-600 text-white',
                isCompleted && 'bg-green-100 text-green-600',
                !isCurrent && !isCompleted && 'bg-gray-100 text-gray-400'
              )}>
                {isCompleted ? <Check className="w-3 h-3" /> : step.num}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ STEP 1: Property Type ═══ */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'ما نوع العقار الذي تريد إدراجه؟' : 'What type of property are you listing?'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'اختر الفئة التي تصف عقارك بشكل أفضل.' : 'Choose the category that best describes your property.'}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {propTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update('type', t.value)}
                className={cn(
                  'p-4 rounded-2xl border-2 text-left transition-all hover:shadow-sm',
                  form.type === t.value
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200'
                )}
              >
                <span className="text-2xl block mb-2">{t.icon}</span>
                <span className="text-sm font-semibold text-gray-900 block">{t.label}</span>
                <span className="text-[11px] text-gray-500 mt-0.5 block">{t.desc}</span>
              </button>
            ))}
          </div>
          {errors.type && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.type}</p>}

          <div className="pt-2">
            <Input
              label={isAr ? 'عنوان العقار' : 'Property Title'}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder={isAr ? 'مثال: شاليه جبلي فاخر مع مسبح لا متناهي' : 'e.g., Luxury Mountain Chalet with Infinity Pool'}
              maxLength={200}
              error={errors.title}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{form.title.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'الوصف' : 'Description'}</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={isAr ? 'ما الذي يميز عقارك؟ صف الإطلالات، الحي، والميزات الفريدة...' : 'What makes your property special? Describe the views, neighborhood, unique features...'}
              rows={4}
              className="input-base resize-none"
              maxLength={5000}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{form.description.length}/5000</p>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Location ═══ */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'أين يقع عقارك؟' : 'Where is your property located?'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'ساعد الضيوف في العثور على عقارك بسهولة.' : 'Help guests find your property easily.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'المدينة' : 'City'}</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update('city', c)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                      form.city === c
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    )}
                  >
                    {isAr ? (CITIES_AR[c] || c) : c}
                  </button>
                ))}
              </div>
              {errors.city && <p className="text-xs text-red-500 flex items-center gap-1 mt-2"><AlertCircle className="w-3 h-3" /> {errors.city}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={isAr ? 'الحي / المنطقة' : 'District / Neighborhood'}
                value={form.district}
                onChange={(e) => update('district', e.target.value)}
                placeholder={isAr ? 'مثال: العليا، الحمراء' : 'e.g., Al Olaya, Al Hamra'}
              />
              <Input
                label={isAr ? 'عنوان الشارع (اختياري)' : 'Street Address (optional)'}
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder={isAr ? 'مثال: طريق الملك فهد' : 'e.g., King Fahad Road'}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Details ═══ */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'تفاصيل العقار' : 'Property details'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'أخبر الضيوف عن حجم وسعة عقارك.' : 'Let guests know the size and capacity of your property.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <NumberStepper label={isAr ? 'الحد الأقصى للضيوف' : 'Maximum Guests'} value={form.maxGuests} min={1} max={50} field="maxGuests" icon={Users} />
            <NumberStepper label={isAr ? 'غرف النوم' : 'Bedrooms'} value={form.bedrooms} min={0} max={20} field="bedrooms" icon={BedDouble} />
            <NumberStepper label={isAr ? 'الأسرّة' : 'Beds'} value={form.beds} min={1} max={30} field="beds" icon={BedDouble} />
            <NumberStepper label={isAr ? 'الحمامات' : 'Bathrooms'} value={form.bathrooms} min={1} max={10} field="bathrooms" icon={Bath} />
          </div>
          {errors.maxGuests && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.maxGuests}</p>}
        </div>
      )}

      {/* ═══ STEP 4: Pricing ═══ */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'حدد أسعارك' : 'Set your pricing'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'يمكنك تعديلها لاحقاً في أي وقت.' : 'You can always adjust these later.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Main price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'السعر لليلة (ريال)' : 'Price per Night (SAR)'}</label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">SAR</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.perNight || ''}
                  onChange={(e) => update('perNight', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base pl-14 text-2xl font-bold h-14"
                />
              </div>
              {errors.perNight && <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errors.perNight}</p>}
              {form.perNight > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {isAr ? 'سيرى الضيوف:' : 'Guests will see:'} <strong className="text-gray-700">{formatPrice(form.perNight)}</strong> {isAr ? '/ليلة' : '/night'}
                  {form.discountPercent > 0 && (
                    <span className="ml-2 text-green-600">
                      ({isAr ? 'بعد الخصم:' : 'Discounted:'} {formatPrice(form.perNight * (1 - form.discountPercent / 100))})
                    </span>
                  )}
                </p>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Secondary pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'رسوم التنظيف (ريال)' : 'Cleaning Fee (SAR)'}</label>
                <input
                  type="number" min="0"
                  value={form.cleaningFee || ''}
                  onChange={(e) => update('cleaningFee', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'خصم (%)' : 'Discount (%)'}</label>
                <input
                  type="number" min="0" max="100"
                  value={form.discountPercent || ''}
                  onChange={(e) => update('discountPercent', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'خصم أسبوعي (%)' : 'Weekly Discount (%)'}</label>
                <input
                  type="number" min="0" max="100"
                  value={form.weeklyDiscount || ''}
                  onChange={(e) => update('weeklyDiscount', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base"
                />
              </div>
            </div>

            {/* Price preview card */}
            {form.perNight > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">{isAr ? 'معاينة السعر (إقامة 3 ليالي)' : 'Price Preview (3-night stay)'}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{formatPrice(form.perNight)} x {isAr ? '3 ليالي' : '3 nights'}</span>
                    <span className="font-medium">{formatPrice(form.perNight * 3)}</span>
                  </div>
                  {form.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'رسوم التنظيف' : 'Cleaning fee'}</span>
                      <span className="font-medium">{formatPrice(form.cleaningFee)}</span>
                    </div>
                  )}
                  {form.discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{isAr ? `خصم (${form.discountPercent}%)` : `Discount (${form.discountPercent}%)`}</span>
                      <span className="font-medium">-{formatPrice(form.perNight * 3 * form.discountPercent / 100)}</span>
                    </div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>{isAr ? 'إجمالي الضيف' : 'Guest total'}</span>
                    <span>{formatPrice(
                      (form.perNight * 3 * (1 - form.discountPercent / 100)) + form.cleaningFee
                    )}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Amenities ═══ */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'ما المرافق التي تقدمها؟' : 'What amenities do you offer?'}</h2>
            <p className="text-sm text-gray-500">
              {isAr ? 'اختر كل ما ينطبق.' : 'Select all that apply.'} {form.amenities.length > 0 && <span className="font-semibold text-primary-600">{form.amenities.length} {isAr ? 'مختارة' : 'selected'}</span>}
            </p>
          </div>

          {Object.entries(AMENITY_CATEGORIES).map(([category, amenities]) => (
            <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">{isAr ? (AMENITY_CATEGORIES_AR[category] || category) : category}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenities.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      form.amenities.includes(amenity)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    )}
                  >
                    <span className="text-base">{getAmenityIcon(amenity)}</span>
                    <span className="truncate">{getAmenityLabel(amenity)}</span>
                    {form.amenities.includes(amenity) && (
                      <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ STEP 6: Images ═══ */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'أضف صور عقارك' : 'Add photos of your property'}</h2>
            <p className="text-sm text-gray-500">
              {isAr ? 'صور عالية الجودة تساعد في جذب المزيد من الضيوف. أضف صورة واحدة على الأقل.' : 'High-quality photos help attract more guests. Add at least 1 image.'}
              {form.images.length > 0 && <span className="font-semibold text-primary-600 ml-1">{form.images.length} {isAr ? 'صورة مضافة' : (form.images.length !== 1 ? 'photos added' : 'photo added')}</span>}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* File upload area */}
            <div
              className="border-2 border-dashed border-primary-200 rounded-xl p-6 text-center mb-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary-500 mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-medium text-primary-600">{isAr ? 'جاري رفع الصور...' : 'Uploading photos...'}</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">{isAr ? 'اضغط لرفع الصور من جهازك' : 'Click to upload photos from your device'}</p>
                  <p className="text-xs text-gray-400 mt-1">{isAr ? 'JPEG، PNG، أو WebP — الحد الأقصى 5MB لكل صورة' : 'JPEG, PNG, or WebP — max 5MB per photo'}</p>
                </>
              )}
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">{isAr ? 'أو' : 'OR'}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* URL input */}
            <div className="flex gap-2 mb-6">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={isAr ? 'الصق رابط الصورة (مثال: https://images.unsplash.com/...)' : 'Paste image URL (e.g., https://images.unsplash.com/...)'}
                className="input-base flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button onClick={addImage} variant="outline" leftIcon={<ImagePlus className="w-4 h-4" />}>
                {isAr ? 'إضافة' : 'Add'}
              </Button>
            </div>

            {errors.images && <p className="text-xs text-red-500 flex items-center gap-1 mb-4"><AlertCircle className="w-3 h-3" /> {errors.images}</p>}

            {form.images.length > 0 ? (
              <div className="space-y-4">
                {/* Cover photo (large) */}
                {form.images.filter(img => img.isPrimary).map((img, i) => (
                  <div key="cover" className="relative rounded-2xl overflow-hidden border-2 border-primary-200 group">
                    <div className="aspect-video relative">
                      <img src={img.url} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute top-3 left-3 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      {isAr ? 'صورة الغلاف' : 'Cover Photo'}
                    </div>
                    <button
                      onClick={() => removeImage(form.images.findIndex(x => x === img))}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
  