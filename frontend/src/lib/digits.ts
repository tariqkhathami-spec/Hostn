/**
 * Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western digits.
 * Arabic keyboards emit these, and `\D` treats them as non-digits, so
 * digit-only inputs silently dropped everything the user typed.
 */
export function toWesternDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Keep only digits, accepting Arabic-Indic and Persian digits as input. */
export function digitsOnly(value: string): string {
  return toWesternDigits(value).replace(/\D/g, '');
}
