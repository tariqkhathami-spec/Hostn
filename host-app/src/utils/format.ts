import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getLocale } from './i18n';

export function formatDate(date: string | Date, fmt: string = 'dd MMM yyyy'): string {
  const locale = getLocale() === 'ar' ? ar : undefined;
  return format(new Date(date), fmt, { locale });
}

export function formatRelativeDate(date: string | Date): string {
  const locale = getLocale() === 'ar' ? ar : undefined;
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale });
}

export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return getLocale() === 'ar' ? `${formatted} ريال` : `SAR ${formatted}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format a phone number for display.
 * Backend now stores phone as raw (e.g. "500000001") without country code.
 * This handles both old format (with +966) and new raw format gracefully.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('966')) return `+${phone}`;
  if (phone.length === 9 && phone.startsWith('5')) return `+966${phone}`;
  if (phone.length === 10 && phone.startsWith('05')) return `+966${phone.slice(1)}`;
  return phone;
}
