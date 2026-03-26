'use client';

import { useLanguage } from '@/context/LanguageContext';
import { MessageSquare } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Messages', ar: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644' },
  comingSoon: { en: 'Messages - Coming Soon', ar: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644 - \u0642\u0631\u064a\u0628\u0627\u064b' },
  description: {
    en: 'You will be able to communicate with your guests here.',
    ar: '\u0633\u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0636\u064a\u0648\u0641\u0643 \u0647\u0646\u0627.',
  },
};

export default function HostMessagesPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.comingSoon[lang]}</h2>
        <p className="text-gray-400 text-sm">{t.description[lang]}</p>
      </div>
    </div>
  );
}
