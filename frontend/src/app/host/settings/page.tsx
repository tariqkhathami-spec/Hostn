'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Settings } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Settings', ar: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' },
  comingSoon: { en: 'Host Settings - Coming Soon', ar: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0636\u064a\u0641 - \u0642\u0631\u064a\u0628\u0627\u064b' },
  description: {
    en: 'You will be able to manage your host preferences and account settings here.',
    ar: '\u0633\u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u0625\u062f\u0627\u0631\u0629 \u062a\u0641\u0636\u064a\u0644\u0627\u062a \u0627\u0644\u0645\u0636\u064a\u0641 \u0648\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0647\u0646\u0627.',
  },
};

export default function HostSettingsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.comingSoon[lang]}</h2>
        <p className="text-gray-400 text-sm">{t.description[lang]}</p>
      </div>
    </div>
  );
}
