import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://hostn-production.up.railway.app/api/v1';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Keys are read from the environment only — never commit a default value.
export const GOOGLE_MAPS_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? Constants.expoConfig?.extra?.googleMapsKey ?? '';

export const MOYASAR_PUBLISHABLE_KEY: string =
  process.env.EXPO_PUBLIC_MOYASAR_KEY ?? Constants.expoConfig?.extra?.moyasarKey ?? '';

export const SAUDI_COUNTRY_CODE = '+966';

// Must match the backend property type enum exactly.
export const PROPERTY_TYPES = [
  { id: 'chalet', label: 'Chalets', icon: 'home-outline' },
  { id: 'apartment', label: 'Apartments', icon: 'business-outline' },
  { id: 'villa', label: 'Villas', icon: 'home-outline' },
  { id: 'studio', label: 'Studios', icon: 'cube-outline' },
  { id: 'farm', label: 'Farms', icon: 'leaf-outline' },
  { id: 'camp', label: 'Camps', icon: 'bonfire-outline' },
  { id: 'hotel', label: 'Hotels', icon: 'bed-outline' },
  { id: 'rest_house', label: 'Rest Houses', icon: 'home-outline' },
  { id: 'room', label: 'Rooms', icon: 'bed-outline' },
  { id: 'hotel_resort', label: 'Hotel Resorts', icon: 'business-outline' },
  { id: 'serviced_apartment', label: 'Serviced Apartments', icon: 'albums-outline' },
] as const;

// The full city list lives in ./cities (shared with the website and host app).
// These are the stored `value`s shown first as quick picks.
export const POPULAR_CITY_VALUES = [
  'Riyadh',
  'Jeddah',
  'Mecca',
  'Madinah',
  'Dammam',
  'Khobar',
  'Abha',
  'Taif',
  'Tabuk',
  'Al Ula',
  'Hail',
  'Jazan',
] as const;

export const SUPPORT_PHONE_DISPLAY = '0500407888';
export const SUPPORT_PHONE_TEL = '+966500407888';
export const SUPPORT_EMAIL = 'hello@hostn.co';
