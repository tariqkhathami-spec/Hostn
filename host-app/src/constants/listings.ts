export interface CityOption {
  value: string;
  en: string;
  ar: string;
}

export const CITIES: CityOption[] = [
  { value: 'Riyadh', en: 'Riyadh', ar: 'الرياض' },
  { value: 'Jeddah', en: 'Jeddah', ar: 'جدة' },
  { value: 'Abha', en: 'Abha', ar: 'أبها' },
  { value: 'Khobar', en: 'Khobar', ar: 'الخبر' },
  { value: 'Taif', en: 'Taif', ar: 'الطائف' },
  { value: 'Al Ula', en: 'Al Ula', ar: 'العلا' },
  { value: 'Hail', en: 'Hail', ar: 'حائل' },
  { value: 'Mecca', en: 'Mecca', ar: 'مكة المكرمة' },
  { value: 'Madinah', en: 'Madinah', ar: 'المدينة' },
  { value: 'Dammam', en: 'Dammam', ar: 'الدمام' },
  { value: 'Yanbu', en: 'Yanbu', ar: 'ينبع' },
  { value: 'Tabuk', en: 'Tabuk', ar: 'تبوك' },
];

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

export const ALL_AMENITIES: AmenityOption[] = [
  { value: 'wifi', en: 'WiFi', ar: 'واي فاي', icon: 'wifi' },
  { value: 'pool', en: 'Pool', ar: 'مسبح', icon: 'water' },
  { value: 'parking', en: 'Parking', ar: 'موقف سيارات', icon: 'car' },
  { value: 'ac', en: 'AC', ar: 'تكييف', icon: 'snow' },
  { value: 'kitchen', en: 'Kitchen', ar: 'مطبخ', icon: 'restaurant' },
  { value: 'tv', en: 'TV', ar: 'تلفزيون', icon: 'tv' },
  { value: 'washer', en: 'Washer', ar: 'غسالة', icon: 'water-outline' },
  { value: 'dryer', en: 'Dryer', ar: 'مجفف', icon: 'sunny' },
  { value: 'gym', en: 'Gym', ar: 'صالة رياضية', icon: 'barbell' },
  { value: 'bbq', en: 'BBQ', ar: 'شواء', icon: 'flame' },
  { value: 'garden', en: 'Garden', ar: 'حديقة', icon: 'leaf' },
  { value: 'balcony', en: 'Balcony', ar: 'بلكونة', icon: 'resize-outline' },
  { value: 'sea_view', en: 'Sea View', ar: 'إطلالة بحرية', icon: 'boat' },
  { value: 'mountain_view', en: 'Mountain View', ar: 'إطلالة جبلية', icon: 'triangle' },
  { value: 'elevator', en: 'Elevator', ar: 'مصعد', icon: 'arrow-up' },
  { value: 'security', en: 'Security', ar: 'أمن', icon: 'shield-checkmark' },
  { value: 'pet_friendly', en: 'Pet Friendly', ar: 'حيوانات أليفة', icon: 'paw' },
  { value: 'smoking_allowed', en: 'Smoking Allowed', ar: 'تدخين مسموح', icon: 'cloudy' },
  { value: 'breakfast_included', en: 'Breakfast', ar: 'إفطار', icon: 'cafe' },
  { value: 'heating', en: 'Heating', ar: 'تدفئة', icon: 'thermometer' },
  { value: 'beach_access', en: 'Beach Access', ar: 'وصول للشاطئ', icon: 'umbrella' },
  { value: 'fireplace', en: 'Fireplace', ar: 'مدفأة', icon: 'bonfire' },
  { value: 'hot_tub', en: 'Hot Tub', ar: 'جاكوزي', icon: 'water' },
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
