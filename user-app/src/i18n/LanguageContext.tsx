import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
import { setCurrentLanguage } from './current';
import * as SecureStore from 'expo-secure-store';
import { translations, type Language, type TranslationKey } from './translations';

const STORAGE_KEY = 'hostn-lang';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  isRTL: true,
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ar');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      // Arabic is the default, so the layout must be right-to-left even when
      // nothing is stored yet (first launch). Previously RTL was only forced
      // after the user had changed the language once, which left a fresh
      // install laid out left-to-right with Arabic text.
      const lang: Language = stored === 'en' ? 'en' : 'ar';
      setLang(lang);
      setCurrentLanguage(lang);
      I18nManager.allowRTL(lang === 'ar');
      I18nManager.forceRTL(lang === 'ar');
    }).catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    setCurrentLanguage(lang);
    SecureStore.setItemAsync(STORAGE_KEY, lang).catch(() => {});
    I18nManager.forceRTL(lang === 'ar');
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let value: string = translations[language][key] ?? translations.en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [language]
  );

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
