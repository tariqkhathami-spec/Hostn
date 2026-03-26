import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} SAR`;
}

export function formatDate(dateStr: string, fmt: string = 'MMM dd, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatPhone(phone: string): string {
  if (phone.length === 9) {
    return `+966 ${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

export function formatNights(checkIn: string, checkOut: string): number {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
