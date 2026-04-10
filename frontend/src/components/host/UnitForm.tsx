'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadApi } from '@/lib/api';
import {
  Loader2, X, ImagePlus, Plus, Minus, Trash2, Check,
  BedDouble, Bath, Waves, UtensilsCrossed, Armchair,
  Droplets, Sparkles, Thermometer, Shirt, Package,
  Tv, Flame, Fan, Music, Dumbbell, Gamepad2, Film,
  Lightbulb, TreePine, Mountain, Umbrella, Sun, Eye,
  Wifi, Car, Shield, Briefcase, Scissors, Tent,
  type LucideIcon,
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
  maxGuests:    { en: 'Max Guests', ar: 'أقصى عدد ضيوف' },

  photos:       { en: 'Photos', ar: 'الصور' },
  uploadHint:   { en: 'Upload photos (JPG, PNG)', ar: 'ارفع صور (JPG, PNG)' },
  uploading:    { en: 'Uploading...', ar: 'جاري الرفع...' },
  main:         { en: 'Main', ar: 'رئيسية' },

  mainAmenities:{ en: 'Main Amenities', ar: 'المرافق الرئيسية' },
  mainAmHint:   { en: 'Toggle to add details for each facility', ar: 'فعّل لإضافة تفاصيل كل مرفق' },

  bedroomsTitle:{ en: 'Bedrooms', ar: 'غرف النوم' },
  bedroomCount: { en: 'Rooms', ar: 'الغرف' },
  singleBeds:   { en: 'Single Beds', ar: 'أسرّة فردية' },
  doubleBeds:   { en: 'Double Beds', ar: 'أسرّة مزدوجة' },

  bathroomTitle:{ en: 'Bathrooms', ar: 'الحمامات' },
  bathroomCount:{ en: 'Count', ar: 'العدد' },
  bathroomAmns: { en: 'Bathroom Amenities', ar: 'مستلزمات الحمام' },

  poolsTitle:   { en: 'Pools', ar: 'المسابح' },
  addPool:      { en: 'Add Pool', ar: 'إضافة مسبح' },
  poolType:     { en: 'Pool Type', ar: 'نوع المسبح' },
  varDepth:     { en: 'Variable Depth', ar: 'عمق متغير' },
  depth:        { en: 'Depth (m)', ar: 'العمق (م)' },
  depthMin:     { en: 'Min Depth (m)', ar: 'أقل عمق (م)' },
  depthMax:     { en: 'Max Depth (m)', ar: 'أقصى عمق (م)' },
  length:       { en: 'Length (m)', ar: 'الطول (م)' },
  width:        { en: 'Width (m)', ar: 'العرض (م)' },
  isEmpty:      { en: 'Empty', ar: 'فارغ' },

  kitchenTitle: { en: 'Kitchen', ar: 'المطبخ' },
  diningCap:    { en: 'Dining Capacity', ar: 'سعة الطعام' },
  kitchenAmns:  { en: 'Kitchen Amenities', ar: 'مستلزمات المطبخ' },

  livingTitle:  { en: 'Living Rooms', ar: 'غرف المعيشة' },
  mainLiving:   { en: 'Main', ar: 'رئيسية' },
  additional:   { en: 'Additional', ar: 'إضافية' },
  outdoor:      { en: 'Outdoor', ar: 'خارجية' },
  annex:        { en: 'Annex', ar: 'ملحق' },

  addlAmenities:{ en: 'Additional Amenities', ar: 'مرافق إضافية' },
  featuresTitle:{ en: 'Features', ar: 'الميزات' },

  insuranceTitle:{ en: 'Insurance', ar: 'التأمين' },
  insurance:    { en: 'Insurance on Arrival', ar: 'تأمين عند الوصول' },
  insuranceAmt: { en: 'Insurance Amount (SAR)', ar: 'مبلغ التأمين (ر.س)' },

  cancelTitle:  { en: 'Cancellation Policy', ar: 'سياسة الإلغاء' },
  rulesTitle:   { en: 'Rules', ar: 'القواعد' },
  writtenRules: { en: 'Written Rules', ar: 'القواعد المكتوبة' },

  save:         { en: 'Save Unit', ar: 'حفظ الوحدة' },
  saving:       { en: 'Saving...', ar: 'جاري الحفظ...' },
  create:       { en: 'Create Unit', ar: 'إنشاء الوحدة' },
};

/* ══════════════════════════════════════════════════════════════════════
   ENUM / DATA
   ══════════════════════════════════════════════════════════════════════ */
const SUITABILITY_OPTIONS = [
  { value: 'family', en: 'Families', ar: 'عائلات' },
  { value: 'singles', en: 'Singles', ar: 'أفراد' },
  { value: 'both', en: 'Both', ar: 'الكل' },
];

/* ── Main amenity toggle definitions ── */
interface MainToggle { key: string; en: string; ar: string; icon: LucideIcon }
const MAIN_TOGGLES: MainToggle[] = [
  { key: 'hasBedrooms',    en: 'Bedrooms',     ar: 'غرف النوم',   icon: BedDouble },
  { key: 'hasBathrooms',   en: 'Bathrooms',    ar: 'الحمامات',    icon: Bath },
  { key: 'hasPool',        en: 'Pool',         ar: 'مسبح',        icon: Waves },
  { key: 'hasKitchen',     en: 'Kitchen',      ar: 'المطبخ',      icon: UtensilsCrossed },
  { key: 'hasLivingRooms', en: 'Living Room',  ar: 'غرف المعيشة', icon: Armchair },
];

/* ── Cancellation policies (radio cards) ── */
const CANCEL_POLICIES: {
  value: string;
  en: { title: string; desc: string; detail?: string };
  ar: { title: string; desc: string; detail?: string };
}[] = [
  {
    value: 'free',
    en: { title: 'Free', desc: 'Guest can cancel or modify at any time before 12:00 PM on check-in day (deposit refunded)', detail: 'Guest can cancel one or more nights at any time before the check-in date or before the modified night (deposit refunded)' },
    ar: { title: 'مجانا', desc: 'عندما يقوم الضيف بالغاء كامل الحجز أو تعديل بعض الليالي في أي وقت قبل الساعة 12 ظهرا بتاريخ الدخول أو قبل تاريخ الليلة المعدلة (يسترجع العربون)' },
  },
  {
    value: 'flexible',
    en: { title: 'Flexible (Recommended)', desc: 'Cancel 2 days before check-in, deposit refunded', detail: 'Guest can cancel one or more nights 48 hours before the night date' },
    ar: { title: 'مرن (موصى به)', desc: 'عندما يقوم الضيف بالغاء الحجز قبل يوم الدخول بيومين يسترجع له العربون', detail: 'يسمح للضيف بإلغاء ليلة أو أكثر من الحجز قبل 48 ساعة من تاريخ الليلة المراد إلغائها' },
  },
  {
    value: 'normal',
    en: { title: 'Moderate', desc: 'Cancel 4 days before check-in, deposit refunded', detail: 'Guest can cancel one or more nights 4 days before the night date' },
    ar: { title: 'معتدل', desc: 'عندما يقوم الضيف بالغاء الحجز قبل يوم الدخول بأربع ايام يسترجع العربون', detail: 'يسمح للضيف بإلغاء ليلة أو أكثر من الحجز قبل 4 أيام من تاريخ الليلة المراد إلغائها' },
  },
  {
    value: 'restricted',
    en: { title: 'Strict (Not Recommended)', desc: 'No refund and no cancellation allowed' },
    ar: { title: 'صارم (غير موصى به)', desc: 'لا يسترجع العربون ولا يسمح بالإلغاء الحجز أو الليالي' },
  },
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

const BATHROOM_AMENITIES: { value: string; en: string; ar: string; icon: LucideIcon }[] = [
  { value: 'bath', en: 'Bathtub', ar: 'حوض استحمام', icon: Bath },
  { value: 'shower', en: 'Shower', ar: 'دش', icon: Droplets },
  { value: 'jacuzzi', en: 'Jacuzzi', ar: 'جاكوزي', icon: Waves },
  { value: 'sauna', en: 'Sauna', ar: 'ساونا', icon: Thermometer },
  { value: 'tissues', en: 'Tissues', ar: 'مناديل', icon: Package },
  { value: 'soap', en: 'Soap', ar: 'صابون', icon: Sparkles },
  { value: 'shampoo', en: 'Shampoo', ar: 'شامبو', icon: Droplets },
  { value: 'slippers', en: 'Slippers', ar: 'شباشب', icon: Fan },
  { value: 'robe', en: 'Bathrobe', ar: 'روب', icon: Shirt },
];

const KITCHEN_AMENITIES: { value: string; en: string; ar: string; icon: LucideIcon }[] = [
  { value: 'equipped_kitchen', en: 'Equipped Kitchen', ar: 'مطبخ مجهز', icon: UtensilsCrossed },
  { value: 'refrigerator', en: 'Refrigerator', ar: 'ثلاجة', icon: Thermometer },
  { value: 'freezer', en: 'Freezer', ar: 'فريزر', icon: Thermometer },
  { value: 'furnace', en: 'Stove', ar: 'موقد', icon: Flame },
  { value: 'microwave', en: 'Microwave', ar: 'مايكروويف', icon: Lightbulb },
  { value: 'water_kettle', en: 'Water Kettle', ar: 'غلاية', icon: Droplets },
  { value: 'coffee_machine', en: 'Coffee Machine', ar: 'ماكينة قهوة', icon: Droplets },
  { value: 'dishes', en: 'Dishes', ar: 'أواني', icon: UtensilsCrossed },
  { value: 'washing_machine', en: 'Washing Machine', ar: 'غسالة', icon: Fan },
];

const UNIT_AMENITIES: { value: string; en: string; ar: string; icon: LucideIcon }[] = [
  { value: 'tv', en: 'TV', ar: 'تلفزيون', icon: Tv },
  { value: 'balcony', en: 'Balcony', ar: 'شرفة', icon: Eye },
  { value: 'outdoor_seating', en: 'Outdoor Seating', ar: 'جلسة خارجية', icon: Sun },
  { value: 'green_area', en: 'Green Area', ar: 'مسطحات خضراء', icon: TreePine },
  { value: 'bbq_area', en: 'BBQ Area', ar: 'منطقة شواء', icon: Flame },
  { value: 'fire_pit', en: 'Fire Pit', ar: 'حفرة نار', icon: Flame },
  { value: 'mist_fan', en: 'Mist Fan', ar: 'مروحة رذاذ', icon: Fan },
  { value: 'speakers', en: 'Speakers', ar: 'سماعات', icon: Music },
  { value: 'extra_lighting', en: 'Extra Lighting', ar: 'إضاءة إضافية', icon: Lightbulb },
  { value: 'projector', en: 'Projector', ar: 'بروجكتر', icon: Film },
  { value: 'shared_pool', en: 'Shared Pool', ar: 'مسبح مشترك', icon: Waves },
  { value: 'lit_pool', en: 'Lit Pool', ar: 'مسبح مضاء', icon: Waves },
  { value: 'slide', en: 'Slide', ar: 'زحليقة', icon: Dumbbell },
  { value: 'two_sections', en: 'Two Sections', ar: 'قسمين', icon: Shield },
  { value: 'two_separate_sections', en: 'Two Separate Sections', ar: 'قسمين منفصلين', icon: Shield },
  { value: 'two_sections_connected', en: 'Two Sections (connected)', ar: 'قسمين (متصلين)', icon: Shield },
  { value: 'womens_pool', en: "Women's Pool", ar: 'مسبح نسائي', icon: Waves },
  { value: 'outdoor_annex', en: 'Outdoor Annex', ar: 'ملحق خارجي', icon: Tent },
  { value: 'tent', en: 'Tent', ar: 'خيمة', icon: Tent },
  { value: 'dining_hall', en: 'Dining Hall', ar: 'قاعة طعام', icon: UtensilsCrossed },
  { value: 'sand_skiing', en: 'Sand Skiing', ar: 'تزلج على الرمال', icon: Mountain },
  { value: 'drivers_room', en: "Driver's Room", ar: 'غرفة سائق', icon: Car },
  { value: 'cinema_room', en: 'Cinema Room', ar: 'غرفة سينما', icon: Film },
  { value: 'luxury_salon', en: 'Luxury Salon', ar: 'صالون فاخر', icon: Sparkles },
  { value: 'hair_salon', en: 'Hair Salon', ar: 'صالون تجميل', icon: Scissors },
  { value: 'bridal_room', en: 'Bridal Room', ar: 'غرفة عروس', icon: Sparkles },
  { value: 'zipline', en: 'Zipline', ar: 'زيبلاين', icon: Dumbbell },
  { value: 'volleyball', en: 'Volleyball', ar: 'كرة طائرة', icon: Dumbbell },
  { value: 'basketball', en: 'Basketball', ar: 'كرة سلة', icon: Dumbbell },
  { value: 'football', en: 'Football', ar: 'كرة قدم', icon: Dumbbell },
  { value: 'table_tennis', en: 'Table Tennis', ar: 'تنس طاولة', icon: Gamepad2 },
  { value: 'playstation', en: 'PlayStation', ar: 'بلايستيشن', icon: Gamepad2 },
  { value: 'sand_games', en: 'Sand Games', ar: 'ألعاب رملية', icon: Sun },
  { value: 'kids_playground', en: 'Kids Playground', ar: 'ملعب أطفال', icon: Dumbbell },
  { value: 'billiards', en: 'Billiards', ar: 'بلياردو', icon: Gamepad2 },
  { value: 'trampoline', en: 'Trampoline', ar: 'ترامبولين', icon: Dumbbell },
  { value: 'massage_chairs', en: 'Massage Chairs', ar: 'كراسي مساج', icon: Armchair },
];

const UNIT_FEATURES: { value: string; en: string; ar: string; icon: LucideIcon }[] = [
  { value: 'internet', en: 'Internet', ar: 'إنترنت', icon: Wifi },
  { value: 'parking', en: 'Parking', ar: 'موقف سيارات', icon: Car },
  { value: 'elevator', en: 'Elevator', ar: 'مصعد', icon: Briefcase },
  { value: 'self_checkin', en: 'Self Check-in', ar: 'دخول ذاتي', icon: Shield },
  { value: 'cleaning', en: 'Cleaning Service', ar: 'خدمة تنظيف', icon: Sparkles },
  { value: 'security_office', en: 'Security', ar: 'حراسة أمنية', icon: Shield },
  { value: 'workspace', en: 'Workspace', ar: 'مساحة عمل', icon: Briefcase },
  { value: 'wardrobe', en: 'Wardrobe', ar: 'خزانة ملابس', icon: Shirt },
  { value: 'personal_care', en: 'Personal Care', ar: 'عناية شخصية', icon: Sparkles },
  { value: 'mountain_view', en: 'Mountain View', ar: 'إطلالة جبلية', icon: Mountain },
  { value: 'sea_view', en: 'Sea View', ar: 'إطلالة بحرية', icon: Waves },
  { value: 'garden_view', en: 'Garden View', ar: 'إطلالة حديقة', icon: TreePine },
  { value: 'mountain_waterfall', en: 'Mountain Waterfall', ar: 'شلال جبلي', icon: Droplets },
  { value: 'private_beach', en: 'Private Beach', ar: 'شاطئ خاص', icon: Umbrella },
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
  // pricing (kept for backward compat; hidden in form)
  priceSun: string; priceMon: string; priceTue: string; priceWed: string;
  priceThu: string; priceFri: string; priceSat: string;
  cleaningFee: string; discountPercent: string; weeklyDiscount: string;
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
   NUMBER STEPPER COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
function NumberStepper({ value, onChange, min = 0, max = 99, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string;
}) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>}
      <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-10 text-center text-sm font-semibold text-gray-900 select-none">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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

  // hasBathrooms is derived from bathroomCount > 0 for backward compat
  const hasBathrooms = Number(form.bathroomCount) > 0 || bathroomAmenities.length > 0;

  /* ── Helpers ─────────────────────────────────── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const toggleBool = (key: keyof UnitFormData) => {
    setForm({ ...form, [key]: !form[key] });
  };
  const toggleInArray = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };
  const setStepper = (key: keyof UnitFormData, val: number) => {
    setForm({ ...form, [key]: String(val) });
  };

  /* ── Main toggle handler (hasBathrooms is special) ── */
  const handleMainToggle = (key: string) => {
    if (key === 'hasBathrooms') {
      // Toggle by setting bathroom count to 1 or 0
      if (hasBathrooms) {
        setForm({ ...form, bathroomCount: '0' });
        setBathroomAmenities([]);
      } else {
        setForm({ ...form, bathroomCount: '1' });
      }
    } else {
      toggleBool(key as keyof UnitFormData);
    }
  };
  const isMainToggleActive = (key: string) => {
    if (key === 'hasBathrooms') return hasBathrooms;
    return !!form[key as keyof UnitFormData];
  };

  /* ── Image upload ── */
  const MAX_IMAGES = 30;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { toast.error(isAr ? `الحد الأقصى ${MAX_IMAGES} صور` : `Maximum ${MAX_IMAGES} images`); return; }
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
  const iconToggleBtn = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-all text-start ${
      active ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          <div>
            <NumberStepper label={t.maxGuests[lang]} value={Number(form.maxGuests) || 1}
              onChange={(v) => setStepper('maxGuests', v)} min={1} max={100} />
          </div>
        </div>
      </div>

      {/* ── 2. Photos ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.photos[lang]}</h2>
        <p className="text-xs text-gray-500 mb-3">{t.uploadHint[lang]}</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
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
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-[10px]">{uploading ? t.uploading[lang] : (isAr ? 'إضافة' : 'Add')}</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" multiple onChange={handleImageUpload} className="hidden" />
      </div>

      {/* ── 3. Main Amenities (toggle grid) ───────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.mainAmenities[lang]}</h2>
        <p className="text-xs text-gray-500 mb-4">{t.mainAmHint[lang]}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {MAIN_TOGGLES.map((tog) => {
            const active = isMainToggleActive(tog.key);
            const Icon = tog.icon;
            return (
              <button key={tog.key} type="button" onClick={() => handleMainToggle(tog.key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                }`}>
                <Icon className="w-8 h-8" />
                <span className="text-xs font-medium text-center">{tog[lang]}</span>
                {active && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            );
          })}
        </div>

        {/* ── Bedroom detail card ── */}
        {form.hasBedrooms && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-primary-500" /> {t.bedroomsTitle[lang]}
            </h3>
            <div className="flex flex-wrap gap-6">
              <NumberStepper label={t.bedroomCount[lang]} value={Number(form.bedroomCount)} onChange={(v) => setStepper('bedroomCount', v)} />
              <NumberStepper label={t.singleBeds[lang]} value={Number(form.singleBeds)} onChange={(v) => setStepper('singleBeds', v)} />
              <NumberStepper label={t.doubleBeds[lang]} value={Number(form.doubleBeds)} onChange={(v) => setStepper('doubleBeds', v)} />
            </div>
          </div>
        )}

        {/* ── Bathroom detail card ── */}
        {hasBathrooms && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Bath className="w-4 h-4 text-primary-500" /> {t.bathroomTitle[lang]}
            </h3>
            <NumberStepper label={t.bathroomCount[lang]} value={Number(form.bathroomCount)} onChange={(v) => setStepper('bathroomCount', v)} min={1} />
            <p className="text-xs font-medium text-gray-600 mt-3">{t.bathroomAmns[lang]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BATHROOM_AMENITIES.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.value} type="button" onClick={() => toggleInArray(bathroomAmenities, setBathroomAmenities, a.value)}
                    className={iconToggleBtn(bathroomAmenities.includes(a.value))}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{a[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Pool detail card ── */}
        {form.hasPool && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Waves className="w-4 h-4 text-primary-500" /> {t.poolsTitle[lang]}
            </h3>

            {pools.map((pool, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white relative">
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

        {/* ── Kitchen detail card ── */}
        {form.hasKitchen && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary-500" /> {t.kitchenTitle[lang]}
            </h3>
            <NumberStepper label={t.diningCap[lang]} value={Number(form.diningCapacity)} onChange={(v) => setStepper('diningCapacity', v)} />
            <p className="text-xs font-medium text-gray-600 mt-3">{t.kitchenAmns[lang]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KITCHEN_AMENITIES.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.value} type="button" onClick={() => toggleInArray(kitchenAmenities, setKitchenAmenities, a.value)}
                    className={iconToggleBtn(kitchenAmenities.includes(a.value))}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{a[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Living room detail card ── */}
        {form.hasLivingRooms && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Armchair className="w-4 h-4 text-primary-500" /> {t.livingTitle[lang]}
            </h3>
            <div className="flex flex-wrap gap-6">
              <NumberStepper label={t.mainLiving[lang]} value={Number(form.livingMain)} onChange={(v) => setStepper('livingMain', v)} />
              <NumberStepper label={t.additional[lang]} value={Number(form.livingAdditional)} onChange={(v) => setStepper('livingAdditional', v)} />
              <NumberStepper label={t.outdoor[lang]} value={Number(form.livingOutdoor)} onChange={(v) => setStepper('livingOutdoor', v)} />
              <NumberStepper label={t.annex[lang]} value={Number(form.livingOutdoorRoom)} onChange={(v) => setStepper('livingOutdoorRoom', v)} />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Additional Amenities ───────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.addlAmenities[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {UNIT_AMENITIES.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.value} type="button" onClick={() => toggleInArray(amenities, setAmenities, a.value)}
                className={iconToggleBtn(amenities.includes(a.value))}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{a[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Features (big icons) ──────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.featuresTitle[lang]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {UNIT_FEATURES.map((f) => {
            const Icon = f.icon;
            const active = features.includes(f.value);
            return (
              <button key={f.value} type="button" onClick={() => toggleInArray(features, setFeatures, f.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                }`}>
                <Icon className="w-7 h-7" />
                <span className="text-xs font-medium text-center">{f[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 6. Insurance ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className={sectionTitle}>{t.insuranceTitle[lang]}</h2>
        <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.insuranceOnArrival} onChange={() => toggleBool('insuranceOnArrival')}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          {t.insurance[lang]}
        </label>
        {form.insuranceOnArrival && (
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.insuranceAmt[lang]}</label>
            <input name="insuranceAmount" type="number" min="0" value={form.insuranceAmount} onChange={handleChange} className={inputClass} />
          </div>
        )}
      </div>

      {/* ── 7. Cancellation Policy (radio cards) ─────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.cancelTitle[lang]}</h2>
        <div className="space-y-3">
          {CANCEL_POLICIES.map((policy) => {
            const active = form.cancellationPolicy === policy.value;
            const p = policy[lang];
            return (
              <label key={policy.value}
                className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  active ? 'border-primary-500 bg-primary-50/60' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="cancellationPolicy" value={policy.value}
                    checked={active} onChange={handleChange}
                    className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                  <div className="min-w-0">
                    <span className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-gray-900'}`}>{p.title}</span>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.desc}</p>
                    {p.detail && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.detail}</p>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── 8. Written Rules ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={sectionTitle}>{t.rulesTitle[lang]}</h2>
        <textarea name="writtenRules" value={form.writtenRules} onChange={handleChange} rows={4} className={inputClass}
          placeholder={isAr ? 'أضف قواعد الوحدة هنا...' : 'Add unit rules here...'} />
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
