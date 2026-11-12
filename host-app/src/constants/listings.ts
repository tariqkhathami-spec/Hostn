// The city list is shared with the website and the guest app — see cities.ts.
import { CITIES, normalizeCity, cityLabel } from './cities';
import type { CityOption } from './cities';

export { CITIES, normalizeCity, cityLabel };
export type { CityOption };

export interface DistrictOption {
  value: string;
  en: string;
  ar: string;
}

export const DISTRICTS: Record<string, DistrictOption[]> = {
  Riyadh: [
    { value: 'Al Olaya', en: 'Al Olaya', ar: 'العليا' },
    { value: 'Al Malaz', en: 'Al Malaz', ar: 'الملز' },
    { value: 'Al Nakheel', en: 'Al Nakheel', ar: 'النخيل' },
    { value: 'Al Wurud', en: 'Al Wurud', ar: 'الورود' },
    { value: 'Al Sulimaniyah', en: 'Al Sulimaniyah', ar: 'السليمانية' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Yasmin', en: 'Al Yasmin', ar: 'الياسمين' },
    { value: 'Al Narjis', en: 'Al Narjis', ar: 'النرجس' },
    { value: 'Al Muhammadiyah', en: 'Al Muhammadiyah', ar: 'المحمدية' },
    { value: 'Al Sahafah', en: 'Al Sahafah', ar: 'الصحافة' },
    { value: 'Al Aqiq', en: 'Al Aqiq', ar: 'العقيق' },
    { value: 'Hittin', en: 'Hittin', ar: 'حطين' },
  ],
  Jeddah: [
    { value: 'Al Hamra', en: 'Al Hamra', ar: 'الحمراء' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Shati', en: 'Al Shati', ar: 'الشاطئ' },
    { value: 'Al Salamah', en: 'Al Salamah', ar: 'السلامة' },
    { value: 'Al Andalus', en: 'Al Andalus', ar: 'الأندلس' },
    { value: 'Al Zahra', en: 'Al Zahra', ar: 'الزهراء' },
    { value: 'Al Nahda', en: 'Al Nahda', ar: 'النهضة' },
    { value: 'Al Marwah', en: 'Al Marwah', ar: 'المروة' },
    { value: 'Obhur', en: 'Obhur', ar: 'أبحر' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: 'الخالدية' },
  ],
  Dammam: [
    { value: 'Al Faisaliyah', en: 'Al Faisaliyah', ar: 'الفيصلية' },
    { value: 'Al Shati', en: 'Al Shati', ar: 'الشاطئ' },
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: 'العزيزية' },
    { value: 'Al Hamra', en: 'Al Hamra', ar: 'الحمراء' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Nakheel', en: 'Al Nakheel', ar: 'النخيل' },
    { value: 'Al Muhammadiyah', en: 'Al Muhammadiyah', ar: 'المحمدية' },
    { value: 'Al Badiyah', en: 'Al Badiyah', ar: 'البادية' },
  ],
  Khobar: [
    { value: 'Al Corniche', en: 'Al Corniche', ar: 'الكورنيش' },
    { value: 'Al Rawabi', en: 'Al Rawabi', ar: 'الروابي' },
    { value: 'Al Thuqbah', en: 'Al Thuqbah', ar: 'الثقبة' },
    { value: 'Al Aqrabiyah', en: 'Al Aqrabiyah', ar: 'العقربية' },
    { value: 'Al Yarmuk', en: 'Al Yarmuk', ar: 'اليرموك' },
    { value: 'Al Ulaya', en: 'Al Ulaya', ar: 'العليا' },
    { value: 'Al Rakah', en: 'Al Rakah', ar: 'الراكة' },
  ],
  Mecca: [
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: 'العزيزية' },
    { value: 'Al Shisha', en: 'Al Shisha', ar: 'الششة' },
    { value: 'Al Rusayfah', en: 'Al Rusayfah', ar: 'الرصيفة' },
    { value: 'Al Naseem', en: 'Al Naseem', ar: 'النسيم' },
    { value: 'Al Awali', en: 'Al Awali', ar: 'العوالي' },
  ],
  Madinah: [
    { value: 'Al Haram', en: 'Al Haram', ar: 'الحرم' },
    { value: 'Quba', en: 'Quba', ar: 'قباء' },
    { value: 'Al Uyun', en: 'Al Uyun', ar: 'العيون' },
    { value: 'Al Azhari', en: 'Al Azhari', ar: 'الأزهري' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: 'الخالدية' },
  ],
  Abha: [
    { value: 'Al Manhal', en: 'Al Manhal', ar: 'المنهل' },
    { value: 'Al Sadd', en: 'Al Sadd', ar: 'السد' },
    { value: 'Al Mahalah', en: 'Al Mahalah', ar: 'المحالة' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
  ],
  Taif: [
    { value: 'Al Hada', en: 'Al Hada', ar: 'الهدا' },
    { value: 'Al Shifa', en: 'Al Shifa', ar: 'الشفا' },
    { value: 'Al Naseem', en: 'Al Naseem', ar: 'النسيم' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: 'الخالدية' },
  ],
  Tabuk: [
    { value: 'Al Muruj', en: 'Al Muruj', ar: 'المروج' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Faisaliyah', en: 'Al Faisaliyah', ar: 'الفيصلية' },
  ],
  Hail: [
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: 'العزيزية' },
    { value: 'Al Naqah', en: 'Al Naqah', ar: 'النقعة' },
    { value: 'Al Samra', en: 'Al Samra', ar: 'السمراء' },
  ],
  'Al Ula': [
    { value: 'Al Ula Old Town', en: 'Al Ula Old Town', ar: 'البلدة القديمة' },
    { value: 'Al Ula Downtown', en: 'Al Ula Downtown', ar: 'وسط العلا' },
  ],
  Yanbu: [
    { value: 'Yanbu Al Sinaiyah', en: 'Yanbu Al Sinaiyah', ar: 'ينبع الصناعية' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Sharm', en: 'Al Sharm', ar: 'الشرم' },
  ],
};

/** Picker entry that lets the host type a district that is not in the list. */
export const OTHER_DISTRICT = '__other__';
export const OTHER_DISTRICT_OPTION: DistrictOption = {
  value: OTHER_DISTRICT,
  en: 'Other district',
  ar: 'حي آخر',
};

/** Districts of a city plus the "other" entry, or [] when the city has no list. */
export function districtOptionsFor(city: string): DistrictOption[] {
  const list = (city && DISTRICTS[city]) || [];
  return list.length > 0 ? [...list, OTHER_DISTRICT_OPTION] : [];
}

/** True when `district` is one of the listed districts of `city`. */
export function isListedDistrict(city: string, district: string): boolean {
  return !!district && ((city && DISTRICTS[city]) || []).some((d) => d.value === district);
}

/** Display name of a stored district (listed value → label, free text as typed). */
export function districtLabel(city: string | undefined | null, district: string | undefined | null, lang: 'ar' | 'en'): string {
  if (!district) return '';
  const hit = ((city && DISTRICTS[normalizeCity(city) || city]) || []).find((d) => d.value === district);
  return hit ? hit[lang] : district;
}

export interface PropertyTypeOption {
  value: string;
  en: string;
  ar: string;
  icon: string;
}

export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: 'apartment', en: 'Apartment', ar: 'شقة', icon: 'business' },
  { value: 'villa', en: 'Villa', ar: 'فيلا', icon: 'home' },
  { value: 'chalet', en: 'Chalet', ar: 'شاليه', icon: 'snow' },
  { value: 'studio', en: 'Studio', ar: 'ستوديو', icon: 'cube' },
  { value: 'farm', en: 'Farm', ar: 'مزرعة', icon: 'leaf' },
  { value: 'camp', en: 'Camp', ar: 'مخيم', icon: 'bonfire' },
  { value: 'hotel', en: 'Hotel', ar: 'فندق', icon: 'bed' },
  { value: 'rest_house', en: 'Rest House', ar: 'استراحة', icon: 'home-outline' },
  { value: 'room', en: 'Room', ar: 'غرفة', icon: 'bed-outline' },
  { value: 'hotel_resort', en: 'Hotel Resort', ar: 'منتجع فندقي', icon: 'business-outline' },
  { value: 'serviced_apartment', en: 'Serviced Apartment', ar: 'شقة مفروشة', icon: 'albums-outline' },
];

export interface AmenityOption {
  value: string;
  en: string;
  ar: string;
  icon: string;
}

// Unit amenities and features. The values are exactly the enums of
// backend/src/models/Unit.js (`amenities` and `features`) — the API rejects
// anything else, so add a value here only after it exists in that model.
export const UNIT_AMENITIES: AmenityOption[] = [
  { value: 'two_sections', en: 'Two sections', ar: 'قسمين', icon: 'git-compare-outline' },
  { value: 'two_separate_sections', en: 'Two separate sections', ar: 'قسمين منفصلين', icon: 'git-compare-outline' },
  { value: 'two_sections_connected', en: 'Two connected sections', ar: 'قسمين متصلين', icon: 'git-merge-outline' },
  { value: 'womens_pool', en: "Women's pool", ar: 'مسبح نساء', icon: 'water-outline' },
  { value: 'shared_pool', en: 'Shared pool', ar: 'مسبح مشترك', icon: 'water' },
  { value: 'lit_pool', en: 'Lit pool', ar: 'مسبح مضاء', icon: 'water' },
  { value: 'slide', en: 'Water slide', ar: 'زحليقة مائية', icon: 'trending-down-outline' },
  { value: 'outdoor_annex', en: 'Outdoor annex', ar: 'ملحق خارجي', icon: 'home-outline' },
  { value: 'tent', en: 'Tent', ar: 'خيمة', icon: 'triangle-outline' },
  { value: 'dining_hall', en: 'Dining hall', ar: 'صالة طعام', icon: 'restaurant-outline' },
  { value: 'drivers_room', en: "Drivers' room", ar: 'غرفة سائقين', icon: 'car-outline' },
  { value: 'cinema_room', en: 'Cinema room', ar: 'غرفة سينما', icon: 'film-outline' },
  { value: 'bridal_room', en: 'Bridal room', ar: 'غرفة عروس', icon: 'heart-outline' },
  { value: 'luxury_salon', en: 'Luxury salon', ar: 'صالون فاخر', icon: 'diamond-outline' },
  { value: 'hair_salon', en: 'Hair salon', ar: 'مشغل نسائي', icon: 'cut-outline' },
  { value: 'balcony', en: 'Balcony', ar: 'شرفة', icon: 'resize-outline' },
  { value: 'outdoor_seating', en: 'Outdoor seating', ar: 'جلسة خارجية', icon: 'sunny-outline' },
  { value: 'green_area', en: 'Green area', ar: 'مسطح أخضر', icon: 'leaf-outline' },
  { value: 'bbq_area', en: 'BBQ area', ar: 'ركن شواء', icon: 'flame-outline' },
  { value: 'fire_pit', en: 'Fire pit', ar: 'مشب نار', icon: 'bonfire-outline' },
  { value: 'mist_fan', en: 'Mist fans', ar: 'مراوح رذاذ', icon: 'snow-outline' },
  { value: 'tv', en: 'TV', ar: 'تلفزيون', icon: 'tv-outline' },
  { value: 'projector', en: 'Projector', ar: 'بروجكتر', icon: 'videocam-outline' },
  { value: 'speakers', en: 'Speakers', ar: 'سماعات', icon: 'volume-high-outline' },
  { value: 'extra_lighting', en: 'Extra lighting', ar: 'إضاءة إضافية', icon: 'bulb-outline' },
  { value: 'playstation', en: 'PlayStation', ar: 'بلايستيشن', icon: 'game-controller-outline' },
  { value: 'billiards', en: 'Billiards', ar: 'بلياردو', icon: 'ellipse-outline' },
  { value: 'table_tennis', en: 'Table tennis', ar: 'تنس طاولة', icon: 'tennisball-outline' },
  { value: 'football', en: 'Football pitch', ar: 'ملعب كرة قدم', icon: 'football-outline' },
  { value: 'volleyball', en: 'Volleyball court', ar: 'ملعب كرة طائرة', icon: 'baseball-outline' },
  { value: 'basketball', en: 'Basketball court', ar: 'ملعب كرة سلة', icon: 'basketball-outline' },
  { value: 'kids_playground', en: 'Kids playground', ar: 'ألعاب أطفال', icon: 'happy-outline' },
  { value: 'trampoline', en: 'Trampoline', ar: 'نطيطة', icon: 'arrow-up-circle-outline' },
  { value: 'sand_games', en: 'Sand games', ar: 'ألعاب رملية', icon: 'color-fill-outline' },
  { value: 'sand_skiing', en: 'Sand skiing', ar: 'تزلج على الرمال', icon: 'analytics-outline' },
  { value: 'zipline', en: 'Zipline', ar: 'زيب لاين', icon: 'git-commit-outline' },
  { value: 'massage_chairs', en: 'Massage chairs', ar: 'كراسي مساج', icon: 'body-outline' },
];

export const UNIT_FEATURES: AmenityOption[] = [
  { value: 'internet', en: 'Internet', ar: 'إنترنت', icon: 'wifi-outline' },
  { value: 'parking', en: 'Parking', ar: 'موقف سيارات', icon: 'car-outline' },
  { value: 'self_checkin', en: 'Self check-in', ar: 'دخول ذاتي', icon: 'key-outline' },
  { value: 'cleaning', en: 'Cleaning service', ar: 'خدمة تنظيف', icon: 'sparkles-outline' },
  { value: 'elevator', en: 'Elevator', ar: 'مصعد', icon: 'arrow-up-outline' },
  { value: 'workspace', en: 'Workspace', ar: 'مكان للعمل', icon: 'laptop-outline' },
  { value: 'wardrobe', en: 'Wardrobe', ar: 'خزانة ملابس', icon: 'shirt-outline' },
  { value: 'personal_care', en: 'Personal care items', ar: 'أدوات عناية شخصية', icon: 'medkit-outline' },
  { value: 'security_office', en: 'Security office', ar: 'مكتب أمن', icon: 'shield-checkmark-outline' },
  { value: 'sea_view', en: 'Sea view', ar: 'إطلالة بحرية', icon: 'boat-outline' },
  { value: 'mountain_view', en: 'Mountain view', ar: 'إطلالة جبلية', icon: 'triangle-outline' },
  { value: 'garden_view', en: 'Garden view', ar: 'إطلالة على حديقة', icon: 'flower-outline' },
  { value: 'mountain_waterfall', en: 'Mountain waterfall', ar: 'شلال جبلي', icon: 'rainy-outline' },
  { value: 'private_beach', en: 'Private beach', ar: 'شاطئ خاص', icon: 'umbrella-outline' },
];

export interface DirectionOption {
  value: string;
  en: string;
  ar: string;
}

export const DIRECTIONS: DirectionOption[] = [
  { value: 'north', en: 'North', ar: 'شمال' },
  { value: 'south', en: 'South', ar: 'جنوب' },
  { value: 'east', en: 'East', ar: 'شرق' },
  { value: 'west', en: 'West', ar: 'غرب' },
  { value: 'northeast', en: 'Northeast', ar: 'شمال شرق' },
  { value: 'northwest', en: 'Northwest', ar: 'شمال غرب' },
  { value: 'southeast', en: 'Southeast', ar: 'جنوب شرق' },
  { value: 'southwest', en: 'Southwest', ar: 'جنوب غرب' },
];

export const TIME_OPTIONS: string[] = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];
