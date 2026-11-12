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
  const formatted = (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  let value = phone;
  if (phone.startsWith('+')) value = phone;
  else if (phone.startsWith('966')) value = `+${phone}`;
  else if (phone.length === 9 && phone.startsWith('5')) value = `+966${phone}`;
  else if (phone.length === 10 && phone.startsWith('05')) value = `+966${phone.slice(1)}`;
  // Isolate as left-to-right so the "+" stays in front inside Arabic text
  // (it was rendering as 966509876543+).
  return `\u2066${value}\u2069`;
}

/**
 * Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western digits.
 * iOS number pads emit Arabic-Indic digits when the keyboard language is
 * Arabic; `\D` treats those as non-digits, so they must be converted before
 * any digit-only filtering.
 */
export function toWesternDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Clean what the host types into a numeric field: Arabic-Indic digits become
 * Western digits, the Arabic decimal separator (٫) and a comma become a dot,
 * and every other character is dropped. Use it in `onChangeText`.
 */
export function cleanNumericInput(value: string, allowDecimal = true): string {
  let out = toWesternDigits(value || '').replace(/[٫,]/g, '.');
  out = out.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
  if (allowDecimal) {
    const dot = out.indexOf('.');
    if (dot !== -1) out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, '');
  }
  return out;
}

/** Parse a typed number (Western or Arabic-Indic digits); NaN when empty or invalid. */
export function parseNumber(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  const cleaned = cleanNumericInput(String(value ?? ''));
  return cleaned === '' || cleaned === '.' ? NaN : Number(cleaned);
}

/** Parse a typed whole number; `fallback` when empty or invalid. */
export function parseWhole(value: string | number | undefined | null, fallback: number): number {
  const n = parseNumber(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
