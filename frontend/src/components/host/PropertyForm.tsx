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

// âââ Bilingual helpers ââââââââââââââââââââââââââââââââââââââââââââââ
function getPropTypes(isAr: boolean): { label: string; value: PropertyType; icon: string; desc: string }[] {
  return [
    { label: isAr ? 'Ø´Ø§ÙÙÙ' : 'Chalet', value: 'chalet', icon: 'ðï¸', desc: isAr ? 'Ø§Ø³ØªØ±Ø§Ø­Ø© ÙÙ Ø§ÙØ·Ø¨ÙØ¹Ø©' : 'Mountain or nature retreat' },
    { label: isAr ? 'Ø´ÙØ©' : 'Apartment', value: 'apartment', icon: 'ð¢', desc: isAr ? 'Ø´ÙØ© ÙÙ Ø§ÙÙØ¯ÙÙØ©' : 'City or urban flat' },
    { label: isAr ? 'ÙÙÙØ§' : 'Villa', value: 'villa', icon: 'ð¡', desc: isAr ? 'ÙÙØ²Ù Ø®Ø§Øµ ÙØ§Ø³Ø¹' : 'Spacious private home' },
    { label: isAr ? 'Ø§Ø³ØªÙØ¯ÙÙ' : 'Studio', value: 'studio', icon: 'ð ', desc: isAr ? 'ÙØ­Ø¯Ø© ØºØ±ÙØ© ÙØ§Ø­Ø¯Ø©' : 'Compact one-room unit' },
    { label: isAr ? 'ÙØ²Ø±Ø¹Ø©' : 'Farm', value: 'farm', icon: 'ð¾', desc: isAr ? 'Ø¥ÙØ§ÙØ© Ø±ÙÙÙØ©' : 'Rural farm stay' },
    { label: isAr ? 'ÙØ®ÙÙ' : 'Camp', value: 'camp', icon: 'âº', desc: isAr ? 'ØªØ®ÙÙÙ Ø£Ù ØªØ®ÙÙÙ ÙØ§Ø®Ø±' : 'Camping or glamping site' },
    { label: isAr ? 'ØºØ±ÙØ© ÙÙØ¯ÙÙØ©' : 'Hotel Room', value: 'hotel', icon: 'ð¨', desc: isAr ? 'Ø¥ÙØ§ÙØ© ÙÙØ¯ÙÙØ©' : 'Hotel-style accommodation' },
  ];
}

// âââ Constants ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const PROPERTY_TYPES: { label: string; value: PropertyType; icon: string; desc: string }[] = [
  { label: 'Chalet', value: 'chalet', icon: 'ðï¸', desc: 'Mountain or nature retreat' },
  { label: 'Apartment', value: 'apartment', icon: 'ð¢', desc: 'City or urban flat' },
  { label: 'Villa', value: 'villa', icon: 'ð¡', desc: 'Spacious private home' },
  { label: 'Studio', value: 'studio', icon: 'ð ', desc: 'Compact one-room unit' },
  { label: 'Farm', value: 'farm', icon: 'ð¾', desc: 'Rural farm stay' },
  { label: 'Camp', value: 'camp', icon: 'âº', desc: 'Camping or glamping site' },
  { label: 'Hotel Room', value: 'hotel', icon: 'ð¨', desc: 'Hotel-style accommodation' },
];

const CITIES_AR: Record<string, string> = {
  'Riyadh': 'Ø§ÙØ±ÙØ§Ø¶', 'Jeddah': 'Ø¬Ø¯Ø©', 'Abha': 'Ø£Ø¨ÙØ§', 'Khobar': 'Ø§ÙØ®Ø¨Ø±',
  'Taif': 'Ø§ÙØ·Ø§Ø¦Ù', 'Al Ula': 'Ø§ÙØ¹ÙØ§', 'Hail': 'Ø­Ø§Ø¦Ù', 'Mecca': 'ÙÙØ©',
  'Madinah': 'Ø§ÙÙØ¯ÙÙØ©', 'Dammam': 'Ø§ÙØ¯ÙØ§Ù', 'Yanbu': 'ÙÙØ¨Ø¹', 'Tabuk': 'ØªØ¨ÙÙ',
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
  'Essentials': 'Ø§ÙØ£Ø³Ø§Ø³ÙØ§Øª',
  'Facilities': 'Ø§ÙÙØ±Ø§ÙÙ',
  'Laundry': 'Ø§ÙØºØ³ÙÙ',
  'Views & Outdoor': 'Ø§ÙØ¥Ø·ÙØ§ÙØ§Øª ÙØ§ÙÙÙØ§Ø¡ Ø§ÙØ·ÙÙ',
  'Guest Policies': 'Ø³ÙØ§Ø³Ø§Øª Ø§ÙØ¶ÙÙÙ',
};

// âââ Step definitions âââââââââââââââââââââââââââââââââââââââââââââââ
function getSteps(isAr: boolean) {
  return [
    { num: 1, label: isAr ? 'ÙÙØ¹ Ø§ÙØ¹ÙØ§Ø±' : 'Property Type', desc: isAr ? 'ÙØ§ ÙÙØ¹ Ø§ÙØ¹ÙØ§Ø±Ø' : 'What kind of property?', icon: Building2 },
    { num: 2, label: isAr ? 'Ø§ÙÙÙÙØ¹' : 'Location', desc: isAr ? 'Ø£ÙÙ ÙÙØ¹Ø' : 'Where is it?', icon: MapPin },
    { num: 3, label: isAr ? 'Ø§ÙØªÙØ§ØµÙÙ' : 'Details', desc: isAr ? 'Ø§ÙØºØ±Ù ÙØ§ÙØ³Ø¹Ø©' : 'Rooms & capacity', icon: Users },
    { num: 4, label: isAr ? 'Ø§ÙØªØ³Ø¹ÙØ±' : 'Pricing', desc: isAr ? 'Ø­Ø¯Ø¯ Ø§ÙØ£Ø³Ø¹Ø§Ø±' : 'Set your rates', icon: DollarSign },
    { num: 5, label: isAr ? 'Ø§ÙÙØ±Ø§ÙÙ' : 'Amenities', desc: isAr ? 'ÙØ§ ØªÙØ¯ÙÙ' : 'What you offer', icon: Sparkles },
    { num: 6, label: isAr ? 'Ø§ÙØµÙØ±' : 'Images', desc: isAr ? 'Ø£Ø¸ÙØ± Ø¹ÙØ§Ø±Ù' : 'Show it off', icon: ImagePlus },
    { num: 7, label: isAr ? 'Ø§ÙÙÙØ§Ø¹Ø¯' : 'Rules', desc: isAr ? 'ÙÙØ§Ø¹Ø¯ Ø§ÙÙÙØ²Ù' : 'House rules', icon: Shield },
    { num: 8, label: isAr ? 'Ø§ÙÙØ±Ø§Ø¬Ø¹Ø©' : 'Review', desc: isAr ? 'ÙØ¹Ø§ÙÙØ© ÙÙØ´Ø±' : 'Preview & publish', icon: Eye },
  ];
}

const STEPS = [
  { num: 1, label: 'Property Type', desc: 'What kind of property?', icon: Building2 },
  { num: 2, label: 'Location', desc: 'Where is it?', icon: MapPin },
  { num: 3, label: 'Details', desc: 'Rooms & capacity', icon: Users },
  { num: 4, label: 'Pricing', desc: 'Set your rates', icon: DollarSign },
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

  // âââ Validation per step ââââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Submit âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Number stepper helper ââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Toggle helper ââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Completion percentage ââââââââââââââââââââââââââââââââââââââââ
  const completionPct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className="max-w-4xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">{isAr ? `Ø§ÙØ®Ø·ÙØ© ${currentStep} ÙÙ ${steps.length}` : `Step ${currentStep} of ${steps.length}`}</span>
          <span className="text-xs font-semibold text-primary-600">{isAr ? `ÙÙØªÙÙ ${completionPct}%` : `${completionPct}% complete`}</span>
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

      {/* âââ STEP 1: Property Type âââ */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'ÙØ§ ÙÙØ¹ Ø§ÙØ¹ÙØ§Ø± Ø§ÙØ°Ù ØªØ±ÙØ¯ Ø¥Ø¯Ø±Ø§Ø¬ÙØ' : 'What type of property are you listing?'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'Ø§Ø®ØªØ± Ø§ÙÙØ¦Ø© Ø§ÙØªÙ ØªØµÙ Ø¹ÙØ§Ø±Ù Ø¨Ø´ÙÙ Ø£ÙØ¶Ù.' : 'Choose the category that best describes your property.'}</p>
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
              label={isAr ? 'Ø¹ÙÙØ§Ù Ø§ÙØ¹ÙØ§Ø±' : 'Property Title'}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder={isAr ? 'ÙØ«Ø§Ù: Ø´Ø§ÙÙÙ Ø¬Ø¨ÙÙ ÙØ§Ø®Ø± ÙØ¹ ÙØ³Ø¨Ø­ ÙØ§ ÙØªÙØ§ÙÙ' : 'e.g., Luxury Mountain Chalet with Infinity Pool'}
              maxLength={200}
              error={errors.title}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{form.title.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø§ÙÙØµÙ' : 'Description'}</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={isAr ? 'ÙØ§ Ø§ÙØ°Ù ÙÙÙØ² Ø¹ÙØ§Ø±ÙØ ØµÙ Ø§ÙØ¥Ø·ÙØ§ÙØ§ØªØ Ø§ÙØ­ÙØ ÙØ§ÙÙÙØ²Ø§Øª Ø§ÙÙØ±ÙØ¯Ø©...' : 'What makes your property special? Describe the views, neighborhood, unique features...'}
              rows={4}
              className="input-base resize-none"
              maxLength={5000}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{form.description.length}/5000</p>
          </div>
        </div>
      )}

      {/* âââ STEP 2: Location âââ */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'Ø£ÙÙ ÙÙØ¹ Ø¹ÙØ§Ø±ÙØ' : 'Where is your property located?'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'Ø³Ø§Ø¹Ø¯ Ø§ÙØ¶ÙÙÙ ÙÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ Ø¹ÙØ§Ø±Ù Ø¨Ø³ÙÙÙØ©.' : 'Help guests find your property easily.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'Ø§ÙÙØ¯ÙÙØ©' : 'City'}</label>
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
                label={isAr ? 'Ø§ÙØ­Ù / Ø§ÙÙÙØ·ÙØ©' : 'District / Neighborhood'}
                value={form.district}
                onChange={(e) => update('district', e.target.value)}
                placeholder={isAr ? 'ÙØ«Ø§Ù: Ø§ÙØ¹ÙÙØ§Ø Ø§ÙØ­ÙØ±Ø§Ø¡' : 'e.g., Al Olaya, Al Hamra'}
              />
              <Input
                label={isAr ? 'Ø¹ÙÙØ§Ù Ø§ÙØ´Ø§Ø±Ø¹ (Ø§Ø®ØªÙØ§Ø±Ù)' : 'Street Address (optional)'}
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder={isAr ? 'ÙØ«Ø§Ù: Ø·Ø±ÙÙ Ø§ÙÙÙÙ ÙÙØ¯' : 'e.g., King Fahad Road'}
              />
            </div>
          </div>
        </div>
      )}

      {/* âââ STEP 3: Details âââ */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'ØªÙØ§ØµÙÙ Ø§ÙØ¹ÙØ§Ø±' : 'Property details'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'Ø£Ø®Ø¨Ø± Ø§ÙØ¶ÙÙÙ Ø¹Ù Ø­Ø¬Ù ÙØ³Ø¹Ø© Ø¹ÙØ§Ø±Ù.' : 'Let guests know the size and capacity of your property.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <NumberStepper label={isAr ? 'Ø§ÙØ­Ø¯ Ø§ÙØ£ÙØµÙ ÙÙØ¶ÙÙÙ' : 'Maximum Guests'} value={form.maxGuests} min={1} max={50} field="maxGuests" icon={Users} />
            <NumberStepper label={isAr ? 'ØºØ±Ù Ø§ÙÙÙÙ' : 'Bedrooms'} value={form.bedrooms} min={0} max={20} field="bedrooms" icon={BedDouble} />
            <NumberStepper label={isAr ? 'Ø§ÙØ£Ø³Ø±ÙØ©' : 'Beds'} value={form.beds} min={1} max={30} field="beds" icon={BedDouble} />
            <NumberStepper label={isAr ? 'Ø§ÙØ­ÙØ§ÙØ§Øª' : 'Bathrooms'} value={form.bathrooms} min={1} max={10} field="bathrooms" icon={Bath} />
          </div>
          {errors.maxGuests && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.maxGuests}</p>}
        </div>
      )}

      {/* âââ STEP 4: Pricing âââ */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'Ø­Ø¯Ø¯ Ø£Ø³Ø¹Ø§Ø±Ù' : 'Set your pricing'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'ÙÙÙÙÙ ØªØ¹Ø¯ÙÙÙØ§ ÙØ§Ø­ÙØ§Ù ÙÙ Ø£Ù ÙÙØª.' : 'You can always adjust these later.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Main price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'Ø§ÙØ³Ø¹Ø± ÙÙÙÙØ© (Ø±ÙØ§Ù)' : 'Price per Night (SAR)'}</label>
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
                  {isAr ? 'Ø³ÙØ±Ù Ø§ÙØ¶ÙÙÙ:' : 'Guests will see:'} <strong className="text-gray-700">{formatPrice(form.perNight)}</strong> {isAr ? '/ÙÙÙØ©' : '/night'}
                  {form.discountPercent > 0 && (
                    <span className="ml-2 text-green-600">
                      ({isAr ? 'Ø¨Ø¹Ø¯ Ø§ÙØ®ØµÙ:' : 'Discounted:'} {formatPrice(form.perNight * (1 - form.discountPercent / 100))})
                    </span>
                  )}
                </p>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Secondary pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø±Ø³ÙÙ Ø§ÙØªÙØ¸ÙÙ (Ø±ÙØ§Ù)' : 'Cleaning Fee (SAR)'}</label>
                <input
                  type="number" min="0"
                  value={form.cleaningFee || ''}
                  onChange={(e) => update('cleaningFee', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø®ØµÙ (%)' : 'Discount (%)'}</label>
                <input
                  type="number" min="0" max="100"
                  value={form.discountPercent || ''}
                  onChange={(e) => update('discountPercent', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø®ØµÙ Ø£Ø³Ø¨ÙØ¹Ù (%)' : 'Weekly Discount (%)'}</label>
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
                <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">{isAr ? 'ÙØ¹Ø§ÙÙØ© Ø§ÙØ³Ø¹Ø± (Ø¥ÙØ§ÙØ© 3 ÙÙØ§ÙÙ)' : 'Price Preview (3-night stay)'}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{formatPrice(form.perNight)} x {isAr ? '3 ÙÙØ§ÙÙ' : '3 nights'}</span>
                    <span className="font-medium">{formatPrice(form.perNight * 3)}</span>
                  </div>
                  {form.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'Ø±Ø³ÙÙ Ø§ÙØªÙØ¸ÙÙ' : 'Cleaning fee'}</span>
                      <span className="font-medium">{formatPrice(form.cleaningFee)}</span>
                    </div>
                  )}
                  {form.discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{isAr ? `Ø®ØµÙ (${form.discountPercent}%)` : `Discount (${form.discountPercent}%)`}</span>
                      <span className="font-medium">-{formatPrice(form.perNight * 3 * form.discountPercent / 100)}</span>
                    </div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>{isAr ? 'Ø¥Ø¬ÙØ§ÙÙ Ø§ÙØ¶ÙÙ' : 'Guest total'}</span>
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

      {/* âââ STEP 5: Amenities âââ */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'ÙØ§ Ø§ÙÙØ±Ø§ÙÙ Ø§ÙØªÙ ØªÙØ¯ÙÙØ§Ø' : 'What amenities do you offer?'}</h2>
            <p className="text-sm text-gray-500">
              {isAr ? 'Ø§Ø®ØªØ± ÙÙ ÙØ§ ÙÙØ·Ø¨Ù.' : 'Select all that apply.'} {form.amenities.length > 0 && <span className="font-semibold text-primary-600">{form.amenities.length} {isAr ? 'ÙØ®ØªØ§Ø±Ø©' : 'selected'}</span>}
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

      {/* âââ STEP 6: Images âââ */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'Ø£Ø¶Ù ØµÙØ± Ø¹ÙØ§Ø±Ù' : 'Add photos of your property'}</h2>
            <p className="text-sm text-gray-500">
              {isAr ? 'ØµÙØ± Ø¹Ø§ÙÙØ© Ø§ÙØ¬ÙØ¯Ø© ØªØ³Ø§Ø¹Ø¯ ÙÙ Ø¬Ø°Ø¨ Ø§ÙÙØ²ÙØ¯ ÙÙ Ø§ÙØ¶ÙÙÙ. Ø£Ø¶Ù ØµÙØ±Ø© ÙØ§Ø­Ø¯Ø© Ø¹ÙÙ Ø§ÙØ£ÙÙ.' : 'High-quality photos help attract more guests. Add at least 1 image.'}
              {form.images.length > 0 && <span className="font-semibold text-primary-600 ml-1">{form.images.length} {isAr ? 'ØµÙØ±Ø© ÙØ¶Ø§ÙØ©' : (form.images.length !== 1 ? 'photos added' : 'photo added')}</span>}
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
                placeholder={isAr ? 'Ø§ÙØµÙ Ø±Ø§Ø¨Ø· Ø§ÙØµÙØ±Ø© (ÙØ«Ø§Ù: https://images.unsplash.com/...)' : 'Paste image URL (e.g., https://images.unsplash.com/...)'}
                className="input-base flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button onClick={addImage} variant="outline" leftIcon={<ImagePlus className="w-4 h-4" />}>
                {isAr ? 'Ø¥Ø¶Ø§ÙØ©' : 'Add'}
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
                      {isAr ? 'ØµÙØ±Ø© Ø§ÙØºÙØ§Ù' : 'Cover Photo'}
                    </div>
                    <button
                      onClick={() => removeImage(form.images.findIndex(x => x === img))}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Other photos grid */}
                {form.images.filter(img => !img.isPrimary).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {form.images.map((img, i) => {
                      if (img.isPrimary) return null;
                      return (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200">
                          <div className="aspect-square relative">
                            <img src={img.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => setPrimaryImage(i)}
                              className="bg-white text-gray-700 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-100"
                            >
                              {isAr ? 'ØªØ¹ÙÙÙ ÙØºÙØ§Ù' : 'Set as cover'}
                            </button>
                            <button
                              onClick={() => removeImage(i)}
                              className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                <ImagePlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">{isAr ? 'ÙØ§ ØªÙØ¬Ø¯ ØµÙØ± Ø¨Ø¹Ø¯' : 'No photos yet'}</p>
                <p className="text-xs text-gray-400 mt-1">{isAr ? 'Ø§ÙØµÙ Ø±Ø§Ø¨Ø·Ø§Ù Ø£Ø¹ÙØ§Ù ÙØ¥Ø¶Ø§ÙØ© Ø£ÙÙ ØµÙØ±Ø©' : 'Paste a URL above to add your first photo'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* âââ STEP 7: Rules âââ */}
      {currentStep === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'Ø­Ø¯Ø¯ ÙÙØ§Ø¹Ø¯ Ø§ÙÙÙØ²Ù' : 'Set your house rules'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'Ø£Ø®Ø¨Ø± Ø§ÙØ¶ÙÙÙ Ø¨ÙØ§ ÙØªÙÙØ¹ÙÙÙ.' : 'Let guests know what to expect.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'ØªØ³Ø¬ÙÙ Ø§ÙØ¯Ø®ÙÙ' : 'Check-in'}</label>
                <input type="time" value={form.checkInTime} onChange={(e) => update('checkInTime', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'ØªØ³Ø¬ÙÙ Ø§ÙØ®Ø±ÙØ¬' : 'Check-out'}</label>
                <input type="time" value={form.checkOutTime} onChange={(e) => update('checkOutTime', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø§ÙØ­Ø¯ Ø§ÙØ£Ø¯ÙÙ ÙÙÙÙØ§ÙÙ' : 'Min Nights'}</label>
                <input type="number" min="1" value={form.minNights} onChange={(e) => update('minNights', parseInt(e.target.value) || 1)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{isAr ? 'Ø§ÙØ­Ø¯ Ø§ÙØ£ÙØµÙ ÙÙÙÙØ§ÙÙ' : 'Max Nights'}</label>
                <input type="number" min="1" value={form.maxNights} onChange={(e) => update('maxNights', parseInt(e.target.value) || 30)} className="input-base" />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-2">
              <ToggleSwitch label={isAr ? 'Ø§ÙØªØ¯Ø®ÙÙ ÙØ³ÙÙØ­' : 'Smoking allowed'} field="smokingAllowed" desc={isAr ? 'ÙÙÙÙ ÙÙØ¶ÙÙÙ Ø§ÙØªØ¯Ø®ÙÙ ÙÙ Ø§ÙØ¹ÙØ§Ø±' : 'Guests may smoke on the property'} />
              <ToggleSwitch label={isAr ? 'Ø§ÙØ­ÙÙØ§ÙØ§Øª Ø§ÙØ£ÙÙÙØ© ÙØ³ÙÙØ­Ø©' : 'Pets allowed'} field="petsAllowed" desc={isAr ? 'ÙÙÙÙ ÙÙØ¶ÙÙÙ Ø¥Ø­Ø¶Ø§Ø± Ø­ÙÙØ§ÙØ§ØªÙÙ' : 'Guests may bring pets'} />
              <ToggleSwitch label={isAr ? 'Ø§ÙØ­ÙÙØ§Øª ÙØ§ÙÙÙØ§Ø³Ø¨Ø§Øª' : 'Parties & events'} field="partiesAllowed" desc={isAr ? 'Ø§ÙØ­ÙÙØ§Øª Ø£Ù Ø§ÙØªØ¬ÙØ¹Ø§Øª Ø§ÙÙØ¨ÙØ±Ø© ÙØ³ÙÙØ­Ø©' : 'Parties or large gatherings are permitted'} />
            </div>
          </div>
        </div>
      )}

      {/* âââ STEP 8: Review âââ */}
      {currentStep === 8 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isAr ? 'Ø±Ø§Ø¬Ø¹ Ø¥Ø¹ÙØ§ÙÙ' : 'Review your listing'}</h2>
            <p className="text-sm text-gray-500">{isAr ? 'ØªØ£ÙØ¯ ÙÙ Ø£Ù ÙÙ Ø´ÙØ¡ ÙØ¨Ø¯Ù Ø¬ÙØ¯Ø§Ù ÙØ¨Ù Ø§ÙÙØ´Ø±.' : 'Make sure everything looks good before publishing.'}</p>
          </div>

          {/* Preview card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {form.images.length > 0 && (
              <div className="relative h-56 sm:h-72">
                <img
                  src={form.images.find(i => i.isPrimary)?.url || form.images[0]?.url}
                  alt={form.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {PROPERTY_TYPES.find(t => t.value === form.type)?.label || form.type}
                  </span>
                  <h3 className="text-xl font-bold mt-2">{form.title || (isAr ? 'Ø¹ÙØ§Ø± Ø¨Ø¯ÙÙ Ø¹ÙÙØ§Ù' : 'Untitled Property')}</h3>
                  <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {form.district && `${form.district}, `}{form.city ? (isAr ? (CITIES_AR[form.city] || form.city) : form.city) : (isAr ? 'ÙÙ ÙØªÙ Ø§Ø®ØªÙØ§Ø± ÙØ¯ÙÙØ©' : 'No city selected')}
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Quick summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{form.maxGuests}</p>
                  <p className="text-[10px] text-gray-500">{isAr ? 'Ø¶ÙÙÙ' : 'Guests'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <BedDouble className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{form.bedrooms}</p>
                  <p className="text-[10px] text-gray-500">{isAr ? 'ØºØ±Ù ÙÙÙ' : 'Bedrooms'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Bath className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{form.bathrooms}</p>
                  <p className="text-[10px] text-gray-500">{isAr ? 'Ø­ÙØ§ÙØ§Øª' : 'Bathrooms'}</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-3 text-center">
                  <DollarSign className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-primary-700">{formatPrice(form.perNight)}</p>
                  <p className="text-[10px] text-primary-500">{isAr ? '/ ÙÙÙØ©' : '/ night'}</p>
                </div>
              </div>

              {form.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{isAr ? 'Ø§ÙÙØµÙ' : 'Description'}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{form.description}</p>
                </div>
              )}

              {form.amenities.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{isAr ? `Ø§ÙÙØ±Ø§ÙÙ (${form.amenities.length})` : `Amenities (${form.amenities.length})`}</h4>
                  <div className="flex flex-wrap gap-2">
                    {form.amenities.map((a) => (
                      <span key={a} className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                        {getAmenityIcon(a)} {getAmenityLabel(a)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{isAr ? 'ÙÙØ§Ø¹Ø¯ Ø§ÙÙÙØ²Ù' : 'House Rules'}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                  <span className="bg-gray-50 px-3 py-2 rounded-lg">{isAr ? 'Ø§ÙØ¯Ø®ÙÙ:' : 'Check-in:'} {form.checkInTime}</span>
                  <span className="bg-gray-50 px-3 py-2 rounded-lg">{isAr ? 'Ø§ÙØ®Ø±ÙØ¬:' : 'Check-out:'} {form.checkOutTime}</span>
                  <span className="bg-gray-50 px-3 py-2 rounded-lg">{isAr ? `Ø£Ø¯ÙÙ ${form.minNights} ÙÙÙØ©` : `Min ${form.minNights} night${form.minNights !== 1 ? 's' : ''}`}</span>
                  <span className="bg-gray-50 px-3 py-2 rounded-lg">{isAr ? `Ø£ÙØµÙ ${form.maxNights} ÙÙÙØ©` : `Max ${form.maxNights} nights`}</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  {form.smokingAllowed && <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">{isAr ? 'Ø§ÙØªØ¯Ø®ÙÙ ÙØ³ÙÙØ­' : 'Smoking OK'}</span>}
                  {form.petsAllowed && <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">{isAr ? 'Ø­ÙÙØ§ÙØ§Øª ÙØ³ÙÙØ­Ø©' : 'Pets OK'}</span>}
                  {form.partiesAllowed && <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">{isAr ? 'Ø­ÙÙØ§Øª ÙØ³ÙÙØ­Ø©' : 'Parties OK'}</span>}
                  {!form.smokingAllowed && <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg">{isAr ? 'ÙÙÙÙØ¹ Ø§ÙØªØ¯Ø®ÙÙ' : 'No smoking'}</span>}
                  {!form.petsAllowed && <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg">{isAr ? 'ÙÙÙÙØ¹ Ø§ÙØ­ÙÙØ§ÙØ§Øª' : 'No pets'}</span>}
                  {!form.partiesAllowed && <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg">{isAr ? 'ÙÙÙÙØ¹ Ø§ÙØ­ÙÙØ§Øª' : 'No parties'}</span>}
                </div>
              </div>

              {/* Images preview row */}
              {form.images.length > 1 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{isAr ? `Ø§ÙØµÙØ± (${form.images.length})` : `Photos (${form.images.length})`}</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="text-sm font-bold text-gray-900 mb-3">{isAr ? 'ÙØ§Ø¦ÙØ© Ø§ÙØªØ­ÙÙ ÙØ¨Ù Ø§ÙÙØ´Ø±' : 'Pre-publish checklist'}</h4>
            <div className="space-y-2">
              {[
                { ok: !!form.title, label: isAr ? 'ØªÙØª Ø¥Ø¶Ø§ÙØ© Ø¹ÙÙØ§Ù Ø§ÙØ¹ÙØ§Ø±' : 'Property title added' },
                { ok: !!form.type, label: isAr ? 'ØªÙ Ø§Ø®ØªÙØ§Ø± ÙÙØ¹ Ø§ÙØ¹ÙØ§Ø±' : 'Property type selected' },
                { ok: !!form.city, label: isAr ? 'ØªÙ ØªØ­Ø¯ÙØ¯ Ø§ÙÙÙÙØ¹' : 'Location set' },
                { ok: form.perNight > 0, label: isAr ? 'ØªÙ ØªØ­Ø¯ÙØ¯ Ø§ÙØ³Ø¹Ø±' : 'Pricing configured' },
                { ok: form.images.length > 0, label: isAr ? 'ØµÙØ±Ø© ÙØ§Ø­Ø¯Ø© Ø¹ÙÙ Ø§ÙØ£ÙÙ' : 'At least 1 photo' },
                { ok: form.amenities.length > 0, label: isAr ? 'ØªÙ Ø§Ø®ØªÙØ§Ø± Ø§ÙÙØ±Ø§ÙÙ' : 'Amenities selected' },
                { ok: !!form.description, label: isAr ? 'ØªÙØª ÙØªØ§Ø¨Ø© Ø§ÙÙØµÙ' : 'Description written' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                    item.ok ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    {item.ok ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
                  </div>
                  <span className={cn('text-sm', item.ok ? 'text-gray-700' : 'text-gray-400')}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* âââ Navigation ââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {isAr ? 'Ø§ÙØ³Ø§Ø¨Ù' : 'Previous'}
        </button>

        <div className="flex gap-3">
          {currentStep < steps.length ? (
            <Button onClick={nextStep} rightIcon={<ChevronRight className="w-4 h-4" />}>
              {isAr ? 'Ø§ÙØªØ§ÙÙ' : 'Continue'}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4" />}
              size="lg"
            >
              {isEditing ? (isAr ? 'ØªØ­Ø¯ÙØ« Ø§ÙØ¹ÙØ§Ø±' : 'Update Property') : (isAr ? 'ÙØ´Ø± Ø§ÙØ¹ÙØ§Ø±' : 'Publish Listing')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
