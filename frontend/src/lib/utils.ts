import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = 'SAR') {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Returns just the formatted number (no currency symbol) — use with SarSymbol component */
export function formatPriceNumber(price: number) {
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export function getPropertyTypeLabel(type: string, lang: 'en' | 'ar' = 'en') {
  const labels: Record<string, { en: string; ar: string }> = {
    chalet: { en: 'Chalet', ar: 'شاليه' },
    apartment: { en: 'Apartment', ar: 'شقة' },
    villa: { en: 'Villa', ar: 'فيلا' },
    studio: { en: 'Studio', ar: 'استوديو' },
    farm: { en: 'Farm', ar: 'مزرعة' },
    camp: { en: 'Camp', ar: 'مخيم' },
    hotel: { en: 'Hotel Room', ar: 'غرفة فندقية' },
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
    mountain_view: '⟰️',
    elevator: '🛗',
    security: '🔒',
    pet_friendly: '🐾',
    smoking_allowed: '🚬',
    breakfast_included: '🍳',
    heating: '🌡️',
    beach_access: '🏖️',
    fireplace: '🔥',
    hot_tub: '♨️',
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
