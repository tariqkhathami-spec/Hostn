'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { Calendar, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

interface Property {
  _id: string;
  title: string;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Calendar', ar: '\u0627\u0644\u062a\u0642\u0648\u064a\u0645' },
  selectProperty: { en: 'Select a property', ar: '\u0627\u062e\u062a\u0631 \u0639\u0642\u0627\u0631\u0627\u064b' },
  comingSoon: { en: 'Calendar view coming soon', ar: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0642\u0631\u064a\u0628\u0627\u064b' },
  comingSoonDesc: {
    en: 'You will be able to manage availability and blocked dates here.',
    ar: '\u0633\u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0648\u0641\u0631 \u0648\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u062d\u0638\u0648\u0631\u0629 \u0647\u0646\u0627.',
  },
};

export default function HostCalendarPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'التقويم' : 'Calendar');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await propertiesApi.getMyProperties();
      const data = res.data.data || res.data || [];
      setProperties(data);
      if (data.length > 0) setSelectedProperty(data[0]._id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Property Selector */}
      <div className="mb-6">
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm min-w-[250px]"
        >
          <option value="">{t.selectProperty[lang]}</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.comingSoon[lang]}</h2>
        <p className="text-gray-400 text-sm">{t.comingSoonDesc[lang]}</p>
      </div>
    </div>
  );
}
