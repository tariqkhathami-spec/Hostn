const RAILWAY_API_URL = 'https://hostn-production.up.railway.app/api/v1';
const DEV_API_URL = RAILWAY_API_URL; // Use Railway backend for dev too
const PROD_API_URL = RAILWAY_API_URL;

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const APP_CONFIG = {
  appName: 'Hostn Host',
  version: '1.0.0',
  supportPhone: '9200 07858',
  supportHours: '10:00 AM - 12:00 AM',
  defaultLocale: 'ar' as const,
  otpLength: 4,
  otpResendCooldown: 30,
  pageSize: 20,
} as const;
