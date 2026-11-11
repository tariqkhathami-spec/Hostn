const RAILWAY_API_URL = 'https://hostn-production.up.railway.app/api/v1';
// Dev builds use the Railway backend unless EXPO_PUBLIC_API_URL points elsewhere
// (e.g. http://localhost:5050/api/v1 for a local backend).
const DEV_API_URL = process.env.EXPO_PUBLIC_API_URL ?? RAILWAY_API_URL;
const PROD_API_URL = RAILWAY_API_URL;

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const APP_CONFIG = {
  appName: 'Hostn Host',
  version: '1.0.0',
  supportPhone: '0500407888',
  supportHours: '10:00 AM - 12:00 AM',
  defaultLocale: 'ar' as const,
  otpLength: 4,
  otpResendCooldown: 30,
  pageSize: 20,
} as const;
