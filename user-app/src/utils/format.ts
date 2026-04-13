import { format, parseISO, differenceInDays } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Convert any Eastern Arabic numerals (٠-٩) or Extended Arabic-Indic (۰-۹)
 * to Western/Hindu-Arabic numerals (0-9).
 * Saudi users prefer Western numerals even when the UI is in Arabic.
 */
export function toWesternNumerals(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function formatCurrency(amount: number, currency = 'SAR'): string {
  // Use 'en' locale to guarantee Western numerals (0-9) on all JS engines.
  // 'en-SA' could produce Eastern Arabic numerals on some React Native runtimes.
  const formatted = (amount ?? 0).toLocaleString('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  // Explicitly use English locale to ensure Western numerals in dates
  return format(d, pattern, { locale: enUS });
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  return `${formatDate(checkIn, 'MMM d')} - ${formatDate(checkOut, 'MMM d, yyyy')}`;
}

export function getNights(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn));
}

export function formatPhone(phone: string, countryCode?: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // If a country code is provided, strip it from the front
  if (countryCode) {
    const codeDigits = countryCode.replace('+', '');
    if (cleaned.startsWith(codeDigits)) {
      cleaned = cleaned.slice(codeDigits.length);
    }
    return `${countryCode} ${cleaned}`;
  }

  // Default: Saudi Arabia formatting
  if (cleaned.startsWith('966')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.length === 9 && cleaned.startsWith('5')) {
    return `+966 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('966')) {
    cleaned = '966' + cleaned;
  }
  return '+' + cleaned;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
