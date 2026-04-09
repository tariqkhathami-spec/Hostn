import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number, currency = 'SAR'): string {
  return `${(amount ?? 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
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
