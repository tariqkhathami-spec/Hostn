import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * PR L: all price formatters display 2 decimal places consistently across
 * the app (e.g. "150.00", "14.85", "172.33"). Previously we showed integer
 * values which hid the cumulative rounding error from `Math.round()` calls
 * in the pricing helpers — see the Excel-vs-UI comparison in the PR.
 */
export function formatPrice(price: number, currency = 'SAR') {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/** Returns just the formatted number (no currency symbol) — use with SarSymbol component */
export function formatPriceNumber(price: number) {
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return format(d, fmt);
}

export function calculateNights(checkIn: string | Date, checkOut: string | Date) {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return differenceInDays(d2, d1);
}

/**
 * Arabic night plural rules (returns full string with number):
 *   1   → ليلة  (no number prefix)
 *   2   → ليلتان  (dual — no number prefix)
 *   3–10 → N ليالي
 *   11+  → N ليلة
 * English: 1 → 1 night, else → N nights
 */
export function getNightLabel(count: number, lang: 'en' | 'ar' = 'en') {
  if (lang === 'ar') {
    if (count === 1) return '\u00A0ليلة';
    if (count === 2) return '\u00A0ليلتان';
    if (count <= 10) return `\u00A0${count} ليالي`;
    return `\u00A0${count} ليلة`;
  }
  return count === 1 ? '1 night' : `${count} nights`;
}

/**
 * Arabic guest plural rules:
 *   1   → ضيف
 *   2   → ضيفان
 *   3–10 → N ضيوف
 *   11+ → N ضيف
 * English: 1 → 1 guest, else → N guests
 */
export function getGuestLabel(count: number, lang: 'en' | 'ar' = 'en') {
  if (lang === 'ar') {
    if (count === 1) return 'ضيف';
    if (count === 2) return 'ضيفان';
    if (count <= 10) return `${count} ضيوف`;
    return `${count} ضيف`;
  }
  return count === 1 ? '1 guest' : `${count} guests`;
}

/**
 * Arabic adult plural rules:
 *   1   → بالغ
 *   2   → بالغان
 *   3–10 → N بالغين
 *   11+ → N بالغ
 * English: 1 → 1 adult, else → N adults
 */
export function getAdultLabel(count: number, lang: 'en' | 'ar' = 'en') {
  if (lang === 'ar') {
    if (count === 1) return 'بالغ';
    if (count === 2) return 'بالغان';
    if (count <= 10) return `${count} بالغين`;
    return `${count} بالغ`;
  }
  return count === 1 ? '1 adult' : `${count} adults`;
}

/**
 * Arabic child plural rules:
 *   1   → طفل
 *   2   → طفلان
 *   3–10 → N أطفال
 *   11+ → N طفل
 * English: 1 → 1 child, else → N children
 */
export function getChildLabel(count: number, lang: 'en' | 'ar' = 'en') {
  if (lang === 'ar') {
    if (count === 1) return 'طفل';
    if (count === 2) return 'طفلان';
    if (count <= 10) return `${count} أطفال`;
    return `${count} طفل`;
  }
  return count === 1 ? '1 child' : `${count} children`;
}

export function getPropertyTypeLabel(type: string, lang: 'en' | 'ar' = 'en') {
  const labels: Record<string, { en: string; ar: string }> = {
    chalet: { en: 'Chalet', ar: 'شاليه' },
    apartment: { en: 'Apartment', ar: 'شقة' },
    villa: { en: 'Villa', ar: 'فيلا' },
    studio: { en: 'Studio', ar: 'استوديو' },
    farm: { en: 'Farm', ar: 'مزرعة' },
    camp: { en: 'Camp', ar: 'مخيم' },
    hotel: { en: 'Hotel Resort', ar: 'منتجع فندقي' },
    rest_house: { en: 'Rest House', ar: 'استراحة' },
    room: { en: 'Room', ar: 'غرفة' },
    hotel_resort: { en: 'Hotel Resort', ar: 'منتجع فندقي' },
    serviced_apartment: { en: 'Serviced Apartment', ar: 'شقة مفروشة' },
  };
  return labels[type]?.[lang] || type;
}

export function getAmenityLabel(amenity: string, lang: 'en' | 'ar' = 'en') {
  const labels: Record<string, { en: string; ar: string }> = {
    wifi: { en: 'WiFi', ar: 'واي فاي' },
    pool: { en: 'Swimming Pool', ar: 'مسبح' },
    parking: { en: 'Free Parking', ar: 'موقف سيارات' },
    ac: { en: 'Air Conditioning', ar: 'تكييف' },
    kitchen: { en: 'Kitchen', ar: 'مطبخ' },
    tv: { en: 'TV', ar: 'تلفزيون' },
    washer: { en: 'Washer', ar: 'غسالة' },
    dryer: { en: 'Dryer', ar: 'مجفف' },
    gym: { en: 'Gym', ar: 'صالة رياضية' },
    bbq: { en: 'BBQ', ar: 'شواء' },
    garden: { en: 'Garden', ar: 'حديقة' },
    balcony: { en: 'Balcony', ar: 'شرفة' },
    sea_view: { en: 'Sea View', ar: 'إطلالة بحرية' },
    mountain_view: { en: 'Mountain View', ar: 'إطلالة جبلية' },
    elevator: { en: 'Elevator', ar: 'مصعد' },
    security: { en: '24/7 Security', ar: 'أمن ٢٤ ساعة' },
    pet_friendly: { en: 'Pet Friendly', ar: 'يسمح بالحيوانات' },
    smoking_allowed: { en: 'Smoking Allowed', ar: 'يسمح بالتدخين' },
    breakfast_included: { en: 'Breakfast Included', ar: 'إفطار مشمول' },
    heating: { en: 'Heating', ar: 'تدفئة' },
    beach_access: { en: 'Beach Access', ar: 'وصول للشاطئ' },
    fireplace: { en: 'Fireplace', ar: 'مدفأة' },
    hot_tub: { en: 'Hot Tub', ar: 'جاكوزي' },
    // Bathroom amenities
    bath: { en: 'Bathtub', ar: 'حوض استحمام' },
    shower: { en: 'Shower', ar: 'دش' },
    jacuzzi: { en: 'Jacuzzi', ar: 'جاكوزي' },
    sauna: { en: 'Sauna', ar: 'ساونا' },
    tissues: { en: 'Tissues', ar: 'مناديل' },
    soap: { en: 'Soap', ar: 'صابون' },
    shampoo: { en: 'Shampoo', ar: 'شامبو' },
    slippers: { en: 'Slippers', ar: 'شباشب' },
    robe: { en: 'Bathrobe', ar: 'روب' },
    // Kitchen amenities
    equipped_kitchen: { en: 'Equipped Kitchen', ar: 'مطبخ مجهز' },
    refrigerator: { en: 'Refrigerator', ar: 'ثلاجة' },
    freezer: { en: 'Freezer', ar: 'فريزر' },
    furnace: { en: 'Stove', ar: 'موقد' },
    microwave: { en: 'Microwave', ar: 'مايكروويف' },
    water_kettle: { en: 'Water Kettle', ar: 'غلاية' },
    coffee_machine: { en: 'Coffee Machine', ar: 'ماكينة قهوة' },
    dishes: { en: 'Dishes', ar: 'أواني' },
    washing_machine: { en: 'Washing Machine', ar: 'غسالة' },
    // Unit amenities
    outdoor_seating: { en: 'Outdoor Seating', ar: 'جلسة خارجية' },
    green_area: { en: 'Green Area', ar: 'مسطحات خضراء' },
    bbq_area: { en: 'BBQ Area', ar: 'منطقة شواء' },
    fire_pit: { en: 'Fire Pit', ar: 'حفرة نار' },
    mist_fan: { en: 'Mist Fan', ar: 'مروحة رذاذ' },
    speakers: { en: 'Speakers', ar: 'سماعات' },
    extra_lighting: { en: 'Extra Lighting', ar: 'إضاءة إضافية' },
    projector: { en: 'Projector', ar: 'بروجكتر' },
    shared_pool: { en: 'Shared Pool', ar: 'مسبح مشترك' },
    lit_pool: { en: 'Lit Pool', ar: 'مسبح مضاء' },
    slide: { en: 'Slide', ar: 'زحليقة' },
    two_sections: { en: 'Two Sections', ar: 'قسمين' },
    two_separate_sections: { en: 'Two Separate Sections', ar: 'قسمين منفصلين' },
    two_sections_connected: { en: 'Two Sections (connected)', ar: 'قسمين (متصلين)' },
    womens_pool: { en: "Women's Pool", ar: 'مسبح نسائي' },
    outdoor_annex: { en: 'Outdoor Annex', ar: 'ملحق خارجي' },
    tent: { en: 'Tent', ar: 'خيمة' },
    dining_hall: { en: 'Dining Hall', ar: 'قاعة طعام' },
    sand_skiing: { en: 'Sand Skiing', ar: 'تزلج على الرمال' },
    drivers_room: { en: "Driver's Room", ar: 'غرفة سائق' },
    cinema_room: { en: 'Cinema Room', ar: 'غرفة سينما' },
    luxury_salon: { en: 'Luxury Salon', ar: 'صالون فاخر' },
    hair_salon: { en: 'Hair Salon', ar: 'صالون تجميل' },
    bridal_room: { en: 'Bridal Room', ar: 'غرفة عروس' },
    zipline: { en: 'Zipline', ar: 'زيبلاين' },
    volleyball: { en: 'Volleyball', ar: 'كرة طائرة' },
    basketball: { en: 'Basketball', ar: 'كرة سلة' },
    football: { en: 'Football', ar: 'كرة قدم' },
    table_tennis: { en: 'Table Tennis', ar: 'تنس طاولة' },
    playstation: { en: 'PlayStation', ar: 'بلايستيشن' },
    sand_games: { en: 'Sand Games', ar: 'ألعاب رملية' },
    kids_playground: { en: 'Kids Playground', ar: 'ملعب أطفال' },
    billiards: { en: 'Billiards', ar: 'بلياردو' },
    trampoline: { en: 'Trampoline', ar: 'ترامبولين' },
    massage_chairs: { en: 'Massage Chairs', ar: 'كراسي مساج' },
    // Unit features
    internet: { en: 'Internet', ar: 'إنترنت' },
    self_checkin: { en: 'Self Check-in', ar: 'دخول ذاتي' },
    cleaning: { en: 'Cleaning Service', ar: 'خدمة تنظيف' },
    security_office: { en: 'Security', ar: 'حراسة أمنية' },
    workspace: { en: 'Workspace', ar: 'مساحة عمل' },
    wardrobe: { en: 'Wardrobe', ar: 'خزانة ملابس' },
    personal_care: { en: 'Personal Care', ar: 'عناية شخصية' },
    garden_view: { en: 'Garden View', ar: 'إطلالة حديقة' },
    mountain_waterfall: { en: 'Mountain Waterfall', ar: 'شلال جبلي' },
    private_beach: { en: 'Private Beach', ar: 'شاطئ خاص' },
  };
  return labels[amenity]?.[lang] || amenity;
}

export function getAmenityIcon(amenity: string) {
  const icons: Record<string, string> = {
    wifi: '📶',
    pool: '🏊',
    parking: '🅿️',
    ac: '❄️',
    kitchen: '🍳',
    tv: '📺',
    washer: '🫧',
    dryer: '💨',
    gym: '💪',
    bbq: '🔥',
    garden: '🌿',
    balcony: '🏙️',
    sea_view: '🌊',
    mountain_view: '⛰️',
    elevator: '🏢',
    security: '🔒',
    pet_friendly: '🐾',
    smoking_allowed: '🚬',
    breakfast_included: '🍳',
    heating: '🌡️',
    beach_access: '🏖️',
    fireplace: '🔥',
    hot_tub: '♨️',
    // Bathroom amenities
    bath: '🛁',
    shower: '🚿',
    jacuzzi: '♨️',
    sauna: '🧖',
    tissues: '🧻',
    soap: '🧼',
    shampoo: '🧴',
    slippers: '🩴',
    robe: '👘',
    // Kitchen amenities
    equipped_kitchen: '🍽️',
    refrigerator: '🧊',
    freezer: '❄️',
    furnace: '🔥',
    microwave: '📡',
    water_kettle: '🫖',
    coffee_machine: '☕',
    dishes: '🍽️',
    washing_machine: '🫧',
    // Unit amenities
    outdoor_seating: '🪑',
    green_area: '🌳',
    bbq_area: '🔥',
    fire_pit: '🔥',
    mist_fan: '💨',
    speakers: '🔊',
    extra_lighting: '💡',
    projector: '📽️',
    shared_pool: '🏊',
    lit_pool: '🏊',
    slide: '🎢',
    two_sections: '🏠',
    two_separate_sections: '🏘️',
    two_sections_connected: '🏠',
    womens_pool: '🏊',
    outdoor_annex: '⛺',
    tent: '⛺',
    dining_hall: '🍽️',
    sand_skiing: '🏂',
    drivers_room: '🚗',
    cinema_room: '🎬',
    luxury_salon: '✨',
    hair_salon: '✂️',
    bridal_room: '💍',
    zipline: '🪂',
    volleyball: '🏐',
    basketball: '🏀',
    football: '⚽',
    table_tennis: '🏓',
    playstation: '🎮',
    sand_games: '🏖️',
    kids_playground: '🎠',
    billiards: '🎱',
    trampoline: '🤸',
    massage_chairs: '💆',
    // Unit features
    internet: '🌐',
    self_checkin: '🔑',
    cleaning: '🧹',
    security_office: '🛡️',
    workspace: '💼',
    wardrobe: '👔',
    personal_care: '🧴',
    garden_view: '🌿',
    mountain_waterfall: '💧',
    private_beach: '🏖️',
  };
  return icons[amenity] || '✓';
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function generateStars(rating: number) {
  return Math.round((rating / 10) * 5);
}

export function getDiscountedPrice(price: number, discountPercent: number) {
  return price * (1 - discountPercent / 100);
}
