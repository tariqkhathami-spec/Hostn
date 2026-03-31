import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number, currency = 'SAR'): string {
  return `${amount.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
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

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('966')) {
    const local = cleaned.slice(3);
    return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
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
