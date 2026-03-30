const RAILWAY_API_URL = 'https://hostn-production.up.railway.app/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || RAILWAY_API_URL;

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
export const IS_MAPS_ENABLED = GOOGLE_MAPS_KEY.length > 0 && !GOOGLE_MAPS_KEY.startsWith('YOUR_');

export const APP_CONFIG = {
  name: 'Hostn',
  version: '1.0.0',
  countryCode: '+966',
  currency: 'SAR',
  locale: 'en',
  otpLength: 6,
  otpResendSeconds: 120,
  chatPollInterval: 5000,
  maxImages: 10,
  maxFileSize: 5 * 1024 * 1024, // 5MB
} as const;

export const PROPERTY_TYPES = [
  { key: 'apartment', label: 'Apartments' },
  { key: 'villa', label: 'Villas' },
  { key: 'chalet', label: 'Chalets' },
  { key: 'farm', label: 'Farms' },
  { key: 'camp', label: 'Camps' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'studio', label: 'Studios' },
] as const;
