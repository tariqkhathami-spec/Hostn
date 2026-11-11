import type { Language } from './translations';

// The active language for code that runs outside React (formatters).
// LanguageProvider keeps it in sync.
let current: Language = 'ar';

export function setCurrentLanguage(lang: Language): void {
  current = lang;
}

export function getCurrentLanguage(): Language {
  return current;
}
