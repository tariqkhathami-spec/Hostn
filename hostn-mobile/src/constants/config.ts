export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://hostn-backend-production.up.railway.app/api';

export const APP_CONFIG = {
  name: 'Hostn',
  version: '1.0.0',
  countryCode: '+966',
  currency: 'SAR',
  locale: 'en',
  otpLength: 4,
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
