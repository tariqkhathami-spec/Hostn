'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadApi } from '@/lib/api';
import {
  Loader2, X, ImagePlus, Plus, Trash2,
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════════════════════════════════════
   TRANSLATIONS
   ══════════════════════════════════════════════════════════════════════ */
const t: Record<string, Record<string, string>> = {
  basicInfo:    { en: 'Basic Info', ar: 'المعلومات الأساسية' },
  nameEn:       { en: 'Name (English)', ar: 'الاسم (إنجليزي)' },
  nameAr:       { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
  description:  { en: 'Description', ar: 'الوصف' },
  area:         { en: 'Area (m²)', ar: 'المساحة (م²)' },
  suitability:  { en: 'Suitable for', ar: 'مناسبة لـ' },
  family:       { en: 'Families', ar: 'عائلات' },
  singles:      { en: 'Singles', ar: 'أفراد' },
  both:         { en: 'Both', ar: 'الكل' },

  photos:       { en: 'Photos', ar: 'الصور' },
  uploadHint:   { en: 'Upload up to 10 photos', ar: 'ارفع حتى 10 صور' },
  uploading:    { en: 'Uploading...', ar: 'جاري الرفع...' },
  main:         { en: 'Main', ar: 'رئيسية' },

  pricing:      { en: 'Pricing (SAR per night)', ar: 'التسعير (ر.س لليلة)' },
  sunday:       { en: 'Sun', ar: 'أحد' },
  monday:       { en: 'Mon', ar: 'إثنين' },
  tuesday:      { en: 'Tue', ar: 'ثلاثاء' },
  wednesday:    { en: 'Wed', ar: 'أربعاء' },
  thursday:     { en: 'Thu', ar: 'خميس' },
  friday:       { en: 'Fri', ar: 'جمعة' },
  saturday:     { en: 'Sat', ar: 'سبت' },
  cleaningFee:  { en: 'Cleaning Fee', ar: 'رسوم التنظيف' },
  discount:     { en: 'Discount %', ar: 'خصم %' },
  weeklyDiscount:{ en: 'Weekly Discount %', ar: 'خصم أسبوعي %' },

  capacityTitle:{ en: 'Capacity & Deposit', ar: 'السعة والعربون' },
  maxGuests:    { en: 'Max Guests', ar: 'أقصى عدد ضيوف' },
  deposit:      { en: 'Deposit %', ar: 'نسبة العربون %' },
  insurance:    { en: 'Insurance on Arrival', ar: 'تأمين عند الوصول' },
  insuranceAmt: { en: 'Insurance Amount (SAR)', ar: 'مبلغ التأمين (ر.س)' },

  roomsTitle:   { en: 'Rooms', ar: 'الغرف' },
  livingRooms:  { en: 'Living Rooms', ar: 'غرف المعيشة' },
  mainLiving:   { en: 'Main', ar: 'رئيسية' },
  additional:   { en: 'Additional', ar: 'إضافية' },
  outdoor:      { en: 'Outdoor', ar: 'خارجية' },
  outdoorRoom:  { en: 'Outdoor Room', ar: 'غرفة خارجية' },
  bedroomsTitle:{ en: 'Bedrooms', ar: 'غرف النوم' },
  bedroomCount: { en: 'Rooms', ar: 'الغرف' },
  singleBeds:   { en: 'Single Beds', ar: 'أسرّة فردية' },
  doubleBeds:   { en: 'Double Beds', ar: 'أسرّة مزدوجة' },
  bathrooms:    { en: 'Bathrooms', ar: 'الحمامات' },
  bathroomCount:{ en: 'Count', ar: 'العدد' },
  bathroomAmns: { en: 'Bathroom Amenities', ar: 'مستلزمات الحمام' },

  kitchenTitle: { en: 'Kitchen', ar: 'المطبخ' },
  hasKitchen:   { en: 'Has Kitchen', ar: 'يوجد مطبخ' },
  diningCap:    { en: 'Dining Capacity', ar: 'سعة الطعام' },
  kitchenAmns:  { en: 'Kitchen Amenities', ar: 'مستلزمات المطبخ' },

  poolsTitle:   { en: 'Pools', ar: 'المسابح' },
  hasPool:      { en: 'Has Pool', ar: 'يوجد مسبح' },
  addPool:      { en: 'Add Pool', ar: 'إضافة مسبح' },
  poolType:     { en: 'Pool Type', ar: 'نوع المسبح' },
  varDepth:     { en: 'Variable Depth', ar: 'عمق متغير' },
  depth:        { en: 'Depth (m)', ar: 'العمق (م)' },
  depthMin:     { en: 'Min Depth (m)', ar: 'أقل عمق (م)' },
  depthMax:     { en: 'Max Depth (m)', ar: 'أقصى عمق (م)' },
  length:       { en: 'Length (m)', ar: 'الطول (م)' },
  width:        { en: 'Width (m)', ar: 'العرض (م)' },
  isEmpty:      { en: 'Empty', ar: 'فارغ' },

  amenitiesTitle:{ en: 'Amenities', ar: 'المرافق' },
  featuresTitle: { en: 'Features', ar: 'الميزات' },

  rulesTitle:   { en: 'Cancellation & Rules', ar: 'الإلغاء والقواعد' },
  cancelPolicy: { en: 'Cancellation Policy', ar: 'سياسة الإلغاء' },
  cancelDesc:   { en: 'Cancellation Description', ar: 'وصف سياسة الإلغاء' },
  writtenRules: { en: 'Written Rules', ar: 'القواعد المكتوبة' },

  save:         { en: 'Save Unit', ar: 'حفظ الوحدة' },
  saving:       { en: 'Saving...', ar: 'جاري الحفظ...' },
  create:       { en: 'Create Unit', ar: 'إنشاء الوحدة' },
  yes:          { en: 'Yes', ar: 'نعم' },
  no:           { en: 'No', ar: 'لا' },
};

/* ══════════════════════════════════════════════════════════════════════
   ENUM LABELS
   ══════════════════════════════════════════════════════════════════════ */
const SUITABILITY_OPTIONS = [
  { value: 'family', en: 'Families', ar: 'عائلات' },
  { value: 'singles', en: 'Singles', ar: 'أفراد' },
  { value: 'both', en: 'Both', ar: 'الكل' },
];

const CANCEL_POLICIES = [
  { value: 'free', en: 'Free', ar: 'مجاني' },
  { value: 'flexible', en: 'Flexible', ar: 'مرن' },
  { value: 'normal', en: 'Normal', ar: 'عادي' },
  { value: 'restricted', en: 'Restricted', ar: 'مقيد' },
];

const POOL_TYPES = [
  { value: 'inside_with_barrier', en: 'Indoor (fenced)', ar: 'داخلي (مسيّج)' },
  { value: 'inside_without_barrier', en: 'Indoor (open)', ar: 'داخلي (مفتوح)' },
  { value: 'outside_with_barrier', en: 'Outdoor (fenced)', ar: 'خارجي (مسيّج)' },
  { value: 'outside_without_barrier', en: 'Outdoor (open)', ar: 'خارجي (مفتوح)' },
  { value: 'waterpark_with_barrier', en: 'Waterpark (fenced)', ar: 'حديقة مائية (مسيّجة)' },
  { value: 'waterpark_without_barrier', en: 'Waterpark (open)', ar: 'حديقة مائية (مفتوحة)' },
  { value: 'heated', en: 'Heated', ar: 'مُدفأ' },
];

const BATHROOM_AMENITIES: { value: string; en: string; ar: string }[] = [
  { value: 'bath', en: 'Bathtub', ar: 'حوض استحمام' },
  { value: 'shower', en: 'Shower', ar: 'دش' },
  { value: 'jacuzzi', en: 'Jacuzzi', ar: 'جاكوزي' },
  { value: 'sauna', en: 'Sauna', ar: 'ساونا' },
  { value: 'tissues', en: 'Tissues', ar: 'مناديل' },
  { value: 'soap', en: 'Soap', ar: 'صابون' },
  { value: 'shampoo', en: 'Shampoo', ar: 'شامبو' },
  { value: 'slippers', en: 'Slippers', ar: 'شباشب' },
  { value: 'robe', en: 'Bathrobe', ar: 'روب' },
];

const KITCHEN_AMENITIES: { value: string; en: string; ar: string }[] = [
  { value: 'equipped_kitchen', en: 'Equipped Kitchen', ar: 'مطبخ مجهز' },
  { value: 'refrigerator', en: 'Refrigerator', ar: 'ثلاجة' },
  { value: 'freezer', en: 'Freezer', ar: 'فريزر' },
  { value: 'furnace', en: 'Stove', ar: 'موقد' },
  { value: 'microwave', en: 'Microwave', ar: 'مايكروويف' },
  { value: 'water_kettle', en: 'Water Kettle', ar: 'غلاية' },
  { value: 'coffee_machine', en: 'Coffee Machine', ar: 'ماكينة قهوة' },
  { value: 'dishes', en: 'Dishes', ar: 'أواني' },
  { value: 'washing_machine', en: 'Washing Machine', ar: 'غسالة' },
];

const UNIT_AMENITIES: { value: string; en: string; ar: string }[] = [
  { value: 'tv', en: 'TV', ar: 'تلفزيون' },
  { value: 'balcony', en: 'Balcony', ar: 'شرفة' },
  { value: 'outdoor_seating', en: 'Outdoor Seating', ar: 'جلسة خارجية' },
  { value: 'green_area', en: 'Green Area', ar: 'مسطحات خضراء' },
  { value: 'bbq_area', en: 'BBQ Area', ar: 'منطقة شواء' },
  { value: 'fire_pit', en: 'Fire Pit', ar: 'حفرة نار' },
  { value: 'mist_fan', en: 'Mist Fan', ar: 'مروحة رذاذ' },
  { value: 'speakers', en: 'Speakers', ar: 'سماعات' },
  { value: 'extra_lighting', en: 'Extra Lighting', ar: 'إضاءة إضافية' },
  { value: 'projector', en: 'Projector', ar: 'بروجكتر' },
  { value: 'shared_pool', en: 'Shared Pool', ar: 'مسبح مشترك' },
  { value: 'lit_pool', en: 'Lit Pool', ar: 'مسبح مضاء' },
  { value: 'slide', en: 'Slide', ar: 'زحليقة' },
  { value: 'two_sections', en: 'Two Sections', ar: 'قسمين' },
  { value: 'two_separate_sections', en: 'Two Separate Sections', ar: 'قسمين منفصلين' },
  { value: 'two_sections_connected', en: 'Two Sections (connected)', ar: 'قسمين (متصلين)' },
  { value: 'womens_pool', en: "Women's Pool", ar: 'مسبح نسائي' },
  { value: 'outdoor_annex', en: 'Outdoor Annex', ar: 'ملحق خارجي' },
  { value: 'tent', en: 'Tent', ar: 'خيمة' },
  { value: 'dining_hall', en: 'Dining Hall', ar: 'قاعة طعام' },
  { value: 'sand_skiing', en: 'Sand Skiing', ar: 'تزلج على الرمال' },
  { value: 'drivers_room', en: "Driver's Room", ar: 'غرفة سائق' },
  { value: 'cinema_room', en: 'Cinema Room', ar: 'غرفة سينما' },
  { value: 'luxury_salon', en: 'Luxury Salon', ar: 'صالون فاخر' },
  { value: 'hair_salon', en: 'Hair Salon', ar: 'صالون تجميل' },
  { value: 'bridal_room', en: 'Bridal Room', ar: 'غرفة عروس' },
  { value: 'zipline', en: 'Zipline', ar: 'زيبلاين' },
  { value: 'volleyball', en: 'Volleyball', ar: 'كرة طائرة' },
  { value: 'basketball', en: 'Basketball', ar: 'كرة سلة' },
  { value: 'football', en: 'Football', ar: 'كرة قدم' },
  { value: 'table_tennis', en: 'Table Tennis', ar: 'تنس طاولة' },
  { value: 'playstation', en: 'PlayStation', ar: 'بلايستيشن' },
  { value: 'sand_games', en: 'Sand Games', ar: 'ألعاب رملية' },
  { value: 'kids_playground', en: 'Kids Playground', ar: 'ملعب أطفال' },
  { value: 'billiards', en: 'Billiards', ar: 'بلياردو' },
  { value: 'trampoline', en: 'Trampoline', ar: 'ترامبولين' },
  { value: 'massage_chairs', en: 'Massage Chairs', ar: 'كراسي مساج' },
];

const UNIT_FEATURES: { value: string; en: string; ar: string }[] = [
  { value: 'internet', en: 'Internet', ar: 'إنترنت' },
  { value: 'parking', en: 'Parking', ar: 'موقف سيارات' },
  { value: 'elevator', en: 'Elevator', ar: 'مصعد' },
  { value: 'self_checkin', en: 'Self Check-in', ar: 'دخول ذاتي' },
  { value: 'cleaning', en: 'Cleaning Service', ar: 'خدمة تنظيف' },
  { value: 'security_office', en: 'Security', ar: 'حراسة أمنية' },
  { value: 'workspace', en: 'Workspace', ar: 'مساحة عمل' },
  { value: 'wardrobe', en: 'Wardrobe', ar: 'خزانة ملابس' },
  { value: 'personal_care', en: 'Personal Care', ar: 'عناية شخصية' },
  { value: 'mountain_view', en: 'Mountain View', ar: 'إطلالة جبلية' },
  { value: 'sea_view', en: 'Sea View', ar: 'إطلالة بحرية' },
  { value: 'garden_view', en: 'Garden View', ar: 'إطلالة حديقة' },
  { value: 'mountain_waterfall', en: 'Mountain Waterfall', ar: 'شلال جبلي' },
  { value: 'private_beach', en: 'Private Beach', ar: 'شاطئ خاص' },
];

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */
export interface PoolEntry {
  _id?: string;
  type: string;
  variableDepth: boolean;
  depthMin?: number;
  depthMax?: number;
  depth?: number;
  lengthM?: number;
  widthM?: number;
  isEmpty: boolean;
}

export interface UnitFormData {
  nameEn: string;
  nameAr: string;
  description: string;
  area: string;
  suitability: string;
  depositPercent: string;
  insuranceOnArrival: boolean;
  insuranceAmount: string;
  cancellationPolicy: string;
  cancellationDescription: string;
  writtenRules: string;
  // rooms
  hasLivingRooms: boolean;
  livingMain: string;
  livingAdditional: string;
  livingOutdoor: string;
  livingOutdoorRoom: string;
  hasBedrooms: boolean;
  bedroomCount: string;
  singleBeds: string;
  doubleBeds: string;
  bathroomCount: string;
  hasKitchen: boolean;
  diningCapacity: string;
  hasPool: boolean;
  // pricing
  priceSun: string;
  priceMon: string;
  priceTue: string;
  priceWed: string;
  priceThu: string;
  priceFri: string;
  priceSat: string;
  cleaningFee: string;
  discountPercent: string;
  weeklyDiscount: string;
  // capacity
  maxGuests: string;
}

export const defaultFormData: UnitFormData = {
  nameEn: '', nameAr: '', description: '', area: '', suitability: 'both',
  depositPercent: '0', insuranceOnArrival: false, insuranceAmount: '0',
  cancellationPolicy: 'flexible', cancellationDescription: '', writtenRules: '',
  hasLivingRooms: false, livingMain: '0', livingAdditional: '0', livingOutdoor: '0', livingOutdoorRoom: '0',
  hasBedrooms: false, bedroomCount: '0', singleBeds: '0', doubleBeds: '0',
  bathroomCount: '0', hasKitchen: false, diningCapacity: '0', hasPool: false,
  priceSun: '0', priceMon: '0', priceTue: '0', priceWed: '0',
  priceThu: '0', priceFri: '0', priceSat: '0',
  cleaningFee: '0', discountPercent: '0', weeklyDiscount: '0',
  maxGuests: '1',
};

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
interface Props {
  initialData?: UnitFormData;
  initialImages?: { url: string; isPrimary: boolean }[];
  initialBathroomAmenities?: string[];
  initialKitchenAmenities?: string[];
  initialAmenities?: string[];
  initialFeatures?: string[];
  initialPools?: PoolEntry[];
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitLabel?: { en: string; ar: string };
}

export default function UnitForm({
  initialData,
  initialImages,
  initialBathroomAmenities,
  initialKitchenAmenities,
  initialAmenities,
  initialFeatures,
  initialPools,
  onSubmit,
  submitLabel,
}: Props) {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [form, setForm] = useState<UnitFormData>(initialData || defaultFormData);
  const [images, setImages] = useState<{ url: string; isPrimary: boolean }[]>(initialImages || []);
  const [bathroomAmenities, setBathroomAmenities] = useState<string[]>(initialBathroomAmenities || []);
  const [kitchenAmenities, setKitchenAmenities] = useState<string[]>(initialKitchenAmenities || []);
  const [amenities, setAmenities] = useState<string[]>(initialAmenities || []);
  const [features, setFeatures] = useState<string[]>(initialFeatures || []);
  const [pools, setPools] = useState<PoolEntry[]>(initialPools || []);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Helpers ─────────────────────────────────────── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const toggleBool = (key: keyof UnitFormData) => {
    setForm({ ...form, [key]: !form[key] });
  };
  const toggleInArray = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  /* ── Image upload (same pattern as property edit) ── */
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = 10 - images.length;
    if (remaining <= 0) { toast.error(isAr ? 'الحد الأقصى 10 صور' : 'Maximum 10 images'); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    const invalid = toUpload.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (invalid.length > 0) { toast.error(isAr ? 'يُقبل فقط صور JPG و PNG' : 'Only JPG and PNG accepted'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    setUploading(true);
    try {
      for (const file of toUpload) {
        const fd = new FormData(); fd.append('image', file);
        const res = await uploadApi.single(fd);
        const url = res.data?.data?.url || res.data?.url;
        if (url) setImages((prev) => [...prev, { url, isPrimary: prev.length === 0 }]);
      }
    } catch { toast.error(isAr ? 'فشل رفع الصورة' : 'Failed to upload image'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const removeImage = (idx: number) => {
    setImages((prev) => { const next = prev.filter((_, i) => i !== idx); if (next.length > 0 && !next.some(i => i.isPrimary)) next[0].isPrimary = true; return next; });
  };
  const setPrimaryImage = (idx: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  /* ── Pool helpers ── */
  const addPool = () => {
    setPools([...pools, { type: 'outside_with_barrier', variableDepth: false, isEmpty: false }]);
  };
  const removePool = (idx: number) => setPools(pools.filter((_, i) => i !== idx));
  const updatePool = (idx: number, key: string, value: unknown) => {
    setPools(pools.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        nameEn: form.nameEn || undefined,
        nameAr: form.nameAr || undefined,
        description: form.description || undefined,
        area: form.area ? Number(form.area) : undefined,
        suitability: form.suitability,
        depositPercent: Number(form.depositPercent) || 0,
        insuranceOnArrival: form.insuranceOnArrival,
        insuranceAmount: form.insuranceOnArrival ? Number(form.insuranceAmount) || 0 : 0,
        cancellationPolicy: form.cancellationPolicy,
        cancellationDescription: form.cancellationDescription || undefined,
        writtenRules: form.writtenRules || undefined,
        images,
        bathroomAmenities,
        amenities,
        features,
        pricing: {
          sunday: Number(form.priceSun) || 0,
          monday: Number(form.priceMon) || 0,
          tuesday: Number(form.priceTue) || 0,
          wednesday: Number(form.priceWed) || 0,
          thursday: Number(form.priceThu) || 0,
          friday: Number(form.priceFri) || 0,
          saturday: Number(form.priceSat) || 0,
          cleaningFee: Number(form.cleaningFee) || 0,
          discountPercent: Number(form.discountPercent) || 0,
          weeklyDiscount: Number(form.weeklyDiscount) || 0,
        },
        capacity: { maxGuests: Number(form.maxGuests) || 1 },
        bathroomCount: Number(form.bathroomCount) || 0,
        // Rooms
        hasLivingRooms: form.hasLivingRooms,
        livingRooms: form.hasLivingRooms
          ? { main: Number(form.livingMain) || 0, additional: Number(form.livingAdditional) || 0, outdoor: Number(form.livingOutdoor) || 0, outdoorRoom: Number(form.livingOutdoorRoom) || 0 }
          : undefined,
        hasBedrooms: form.hasBedrooms,
        bedrooms: form.hasBedrooms
          ? { count: Number(form.bedroomCount) || 0, singleBeds: Number(form.singleBeds) || 0, doubleBeds: Number(form.doubleBeds) || 0 }
          : undefined,
        hasKitchen: form.hasKitchen,
        kitchen: form.hasKitchen
          ? { diningCapacity: Number(form.diningCapacity) || 0, amenities: kitchenAmenities }
          : undefined,
        hasPool: form.hasPool,
        pools: form.hasPool ? pools : [],
      };
      await onSubmit(payload);
    } catch {
      // handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Styles ── */
  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 focus:bg-white outline-none text-sm transition-all duration-200';
  const sectionTitle = 'text-base font-semibold text-gray-900 mb-3';
  const toggleBtnClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-start ${
      active ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
    }`;

  const btnLabel = submitLabel || (initialData ? t.save : t.create);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── 1. Basic Info ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className={sectionTitle}>{t.basicInfo[lang]}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameEn[lang]}</label>
            <input name="nameEn" value={form.nameEn} onChange={handleChange} className={inputClass} placeholder="e.g. Deluxe Suite" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameAr[lang]}</label>
            <input name="nameAr" value={form.nameAr} onChange={handleChange} className={inputClass} dir="rtl" placeholder="مثال: جناح فاخر" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.description[lang]}</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.area[lang]}</label>
            <input name="area" type="number" min="0" value={form.area} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.suitability[lang]}</label>
            <select name="suitability" value={form.suitability} onChange={handleChange} className={inputClass}>
              {SUITABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o[lang]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Photos ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.photos[lang]}</h2>
        <p className="text-xs text-gray-500 mb-3">{t.uploadHint[lang]}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
              <Image src={img.url} alt="" fill className="object-cover" unoptimized />
              {img.isPrimary && (
                <span className="absolute top-1.5 start-1.5 text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded font-medium">{t.main[lang]}</span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                {!img.isPrimary && (
                  <button type="button" onClick={() => setPrimaryImage(idx)} className="p-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100">{t.main[lang]}</button>
                )}
                <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {images.length < 10 && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              <span className="text-[10px]">{uploading ? t.uploading[lang] : (isAr ? 'إضافة' : 'Add')}</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" multiple onChange={handleImageUpload} className="hidden" />
      </div>

      {/* ── 3. Pricing ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.pricing[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {[
            { key: 'priceSun', label: t.sunday },
            { key: 'priceMon', label: t.monday },
            { key: 'priceTue', label: t.tuesday },
            { key: 'priceWed', label: t.wednesday },
            { key: 'priceThu', label: t.thursday },
            { key: 'priceFri', label: t.friday },
            { key: 'priceSat', label: t.saturday },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label[lang]}</label>
              <input name={key} type="number" min="0" value={form[key as keyof UnitFormData] as string} onChange={handleChange} className={inputClass} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.cleaningFee[lang]}</label>
            <input name="cleaningFee" type="number" min="0" value={form.cleaningFee} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.discount[lang]}</label>
            <input name="discountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.weeklyDiscount[lang]}</label>
            <input name="weeklyDiscount" type="number" min="0" max="100" value={form.weeklyDiscount} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── 4. Capacity & Deposit ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.capacityTitle[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.maxGuests[lang]}</label>
            <input name="maxGuests" type="number" min="1" value={form.maxGuests} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.deposit[lang]}</label>
            <input name="depositPercent" type="number" min="0" max="100" value={form.depositPercent} onChange={handleChange} className={inputClass} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-3">
              <input type="checkbox" checked={form.insuranceOnArrival} onChange={() => toggleBool('insuranceOnArrival')}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              {t.insurance[lang]}
            </label>
          </div>
          {form.insuranceOnArrival && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.insuranceAmt[lang]}</label>
              <input name="insuranceAmount" type="number" min="0" value={form.insuranceAmount} onChange={handleChange} className={inputClass} />
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Rooms ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className={sectionTitle}>{t.roomsTitle[lang]}</h2>

        {/* Living rooms */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
            <input type="checkbox" checked={form.hasLivingRooms} onChange={() => toggleBool('hasLivingRooms')}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            {t.livingRooms[lang]}
          </label>
          {form.hasLivingRooms && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ms-6">
              {[
                { key: 'livingMain', label: t.mainLiving },
                { key: 'livingAdditional', label: t.additional },
                { key: 'livingOutdoor', label: t.outdoor },
                { key: 'livingOutdoorRoom', label: t.outdoorRoom },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label[lang]}</label>
                  <input name={key} type="number" min="0" value={form[key as keyof UnitFormData] as string} onChange={handleChange} className={inputClass} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bedrooms */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
            <input type="checkbox" checked={form.hasBedrooms} onChange={() => toggleBool('hasBedrooms')}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            {t.bedroomsTitle[lang]}
          </label>
          {form.hasBedrooms && (
            <div className="grid grid-cols-3 gap-3 ms-6">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t.bedroomCount[lang]}</label>
                <input name="bedroomCount" type="number" min="0" value={form.bedroomCount} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t.singleBeds[lang]}</label>
                <input name="singleBeds" type="number" min="0" value={form.singleBeds} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t.doubleBeds[lang]}</label>
                <input name="doubleBeds" type="number" min="0" value={form.doubleBeds} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* Bathrooms */}
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.bathroomCount[lang]}</label>
              <input name="bathroomCount" type="number" min="0" value={form.bathroomCount} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-600 mb-2">{t.bathroomAmns[lang]}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BATHROOM_AMENITIES.map((a) => (
              <button key={a.value} type="button" onClick={() => toggleInArray(bathroomAmenities, setBathroomAmenities, a.value)}
                className={toggleBtnClass(bathroomAmenities.includes(a.value))}>
                {a[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6. Kitchen ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3 cursor-pointer">
          <input type="checkbox" checked={form.hasKitchen} onChange={() => toggleBool('hasKitchen')}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          {t.kitchenTitle[lang]}
        </label>
        {form.hasKitchen && (
          <div className="space-y-3 ms-6">
            <div className="max-w-xs">
              <label className="block text-xs text-gray-600 mb-1">{t.diningCap[lang]}</label>
              <input name="diningCapacity" type="number" min="0" value={form.diningCapacity} onChange={handleChange} className={inputClass} />
            </div>
            <p className="text-xs font-medium text-gray-600 mb-2">{t.kitchenAmns[lang]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KITCHEN_AMENITIES.map((a) => (
                <button key={a.value} type="button" onClick={() => toggleInArray(kitchenAmenities, setKitchenAmenities, a.value)}
                  className={toggleBtnClass(kitchenAmenities.includes(a.value))}>
                  {a[lang]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Pools ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3 cursor-pointer">
          <input type="checkbox" checked={form.hasPool} onChange={() => toggleBool('hasPool')}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          {t.poolsTitle[lang]}
        </label>
        {form.hasPool && (
          <div className="space-y-4 ms-6">
            {pools.map((pool, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4 relative">
                <button type="button" onClick={() => removePool(idx)}
                  className="absolute top-2 end-2 p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t.poolType[lang]}</label>
                    <select value={pool.type} onChange={(e) => updatePool(idx, 'type', e.target.value)} className={inputClass}>
                      {POOL_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt[lang]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t.length[lang]}</label>
                    <input type="number" min="0" step="0.1" value={pool.lengthM || ''} onChange={(e) => updatePool(idx, 'lengthM', Number(e.target.value) || undefined)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t.width[lang]}</label>
                    <input type="number" min="0" step="0.1" value={pool.widthM || ''} onChange={(e) => updatePool(idx, 'widthM', Number(e.target.value) || undefined)} className={inputClass} />
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={pool.variableDepth} onChange={() => updatePool(idx, 'variableDepth', !pool.variableDepth)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600" />
                    {t.varDepth[lang]}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={pool.isEmpty} onChange={() => updatePool(idx, 'isEmpty', !pool.isEmpty)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600" />
                    {t.isEmpty[lang]}
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {pool.variableDepth ? (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t.depthMin[lang]}</label>
                        <input type="number" min="0" step="0.1" value={pool.depthMin || ''} onChange={(e) => updatePool(idx, 'depthMin', Number(e.target.value) || undefined)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t.depthMax[lang]}</label>
                        <input type="number" min="0" step="0.1" value={pool.depthMax || ''} onChange={(e) => updatePool(idx, 'depthMax', Number(e.target.value) || undefined)} className={inputClass} />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t.depth[lang]}</label>
                      <input type="number" min="0" step="0.1" value={pool.depth || ''} onChange={(e) => updatePool(idx, 'depth', Number(e.target.value) || undefined)} className={inputClass} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button type="button" onClick={addPool}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Plus className="w-4 h-4" /> {t.addPool[lang]}
            </button>
          </div>
        )}
      </div>

      {/* ── 8. Amenities ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.amenitiesTitle[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIT_AMENITIES.map((a) => (
            <button key={a.value} type="button" onClick={() => toggleInArray(amenities, setAmenities, a.value)}
              className={toggleBtnClass(amenities.includes(a.value))}>
              {a[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 9. Features ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.featuresTitle[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIT_FEATURES.map((f) => (
            <button key={f.value} type="button" onClick={() => toggleInArray(features, setFeatures, f.value)}
              className={toggleBtnClass(features.includes(f.value))}>
              {f[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 10. Cancellation & Rules ──────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className={sectionTitle}>{t.rulesTitle[lang]}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.cancelPolicy[lang]}</label>
            <select name="cancellationPolicy" value={form.cancellationPolicy} onChange={handleChange} className={inputClass}>
              {CANCEL_POLICIES.map((p) => <option key={p.value} value={p.value}>{p[lang]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.cancelDesc[lang]}</label>
          <textarea name="cancellationDescription" value={form.cancellationDescription} onChange={handleChange} rows={2} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.writtenRules[lang]}</label>
          <textarea name="writtenRules" value={form.writtenRules} onChange={handleChange} rows={3} className={inputClass} />
        </div>
      </div>

      {/* ── Submit ─────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? t.saving[lang] : btnLabel[lang]}
      </button>
    </form>
  );
}
