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

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt);
}

export function calculateNights(checkIn: string | Date, checkOut: string | Date) {
  return differenceInDays(new Date(checkOut), new Date(checkIn));
}

export function getPropertyTypeLabel(type: string) {
  const labels: Record<string, string> = {
    chalet: 'Chalet',
    apartment: 'Apartment',
    villa: 'Villa',
    studio: 'Studio',
    farm: 'Farm',
    camp: 'Camp',
    hotel: 'Hotel Room',
  };
  return labels[type] || type;
}

export function getAmenityLabel(amenity: string) {
  const labels: Record<string, string> = {
    wifi: 'WiFi',
    pool: 'Swimming Pool',
    parking: 'Free Parking',
    ac: 'Air Conditioning',
    kitchen: 'Kitchen',
    tv: 'TV',
    washer: 'Washer',
    dryer: 'Dryer',
    gym: 'Gym',
    bbq: 'BBQ',
    garden: 'Garden',
    balcony: 'Balcony',
    sea_view: 'Sea View',
    mountain_view: 'Mountain View',
    elevator: 'Elevator',
    security: '24/7 Security',
    pet_friendly: 'Pet Friendly',
    smoking_allowed: 'Smoking Allowed',
    breakfast_included: 'Breakfast Included',
    heating: 'Heating',
    beach_access: 'Beach Access',
    fireplace: 'Fireplace',
    hot_tub: 'Hot Tub',
  };
  return labels[amenity] || amenity;
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
