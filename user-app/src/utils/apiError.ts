import { getCurrentLanguage } from '../i18n/current';

/**
 * Message to show for a failed API call. The server's own message is used
 * only when it is in the app's language — an English server message is not
 * shown inside the Arabic UI; the translated fallback is used instead.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as any)?.response?.data?.message;
  if (typeof message !== 'string' || !message.trim()) return fallback;
  const hasArabic = /[؀-ۿ]/.test(message);
  return hasArabic === (getCurrentLanguage() === 'ar') ? message : fallback;
}
