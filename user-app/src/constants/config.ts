import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://hostn-production.up.railway.app/api/v1';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const SAUDI_COUNTRY_CODE = '+966';

export const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartments', icon: 'business-outline' },
  { id: 'chalet', label: 'Chalets', icon: 'home-outline' },
  { id: 'farm', label: 'Farms', icon: 'leaf-outline' },
  { id: 'camp', label: 'Camps', icon: 'bonfire-outline' },
  { id: 'resort', label: 'Resorts', icon: 'bed-outline' },
] as const;

export const SAUDI_CITIES = [
  { id: 'riyadh', name: 'Riyadh', nameAr: 'الرياض' },
  { id: 'jeddah', name: 'Jeddah', nameAr: 'جدة' },
  { id: 'mecca', name: 'Mecca', nameAr: 'مكة المكرمة' },
  { id: 'medina', name: 'Medina', nameAr: 'المدينة المنورة' },
  { id: 'dammam', name: 'Dammam', nameAr: 'الدمام' },
  { id: 'khobar', name: 'Al Khobar', nameAr: 'الخبر' },
  { id: 'abha', name: 'Abha', nameAr: 'أبها' },
  { id: 'taif', name: 'Taif', nameAr: 'الطائف' },
  { id: 'tabuk', name: 'Tabuk', nameAr: 'تبوك' },
  { id: 'alula', name: 'AlUla', nameAr: 'العلا' },
  { id: 'hail', name: 'Hail', nameAr: 'حائل' },
  { id: 'jizan', name: 'Jizan', nameAr: 'جازان' },
] as const;
