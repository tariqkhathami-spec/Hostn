'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Mountain, Castle, Building2, Sofa, Wheat, Tent, Hotel } from 'lucide-react';

export default function CategoryNav() {
  const { t } = useLanguage();

  const categories = [
    { label: t('type.chalets'), Icon: Mountain, value: 'chalet', color: 'bg-blue-50 text-blue-600' },
    { label: t('type.villas'), Icon: Castle, value: 'villa', color: 'bg-purple-50 text-purple-600' },
    { label: t('type.apartments'), Icon: Building2, value: 'apartment', color: 'bg-green-50 text-green-600' },
    { label: t('type.studios'), Icon: Sofa, value: 'studio', color: 'bg-amber-50 text-amber-600' },
    { label: t('type.farms'), Icon: Wheat, value: 'farm', color: 'bg-emerald-50 text-emerald-600' },
    { label: t('type.camps'), Icon: Tent, value: 'camp', color: 'bg-orange-50 text-orange-600' },
    { label: t('type.hotels'), Icon: Hotel, value: 'hotel', color: 'bg-red-50 text-red-600' },
  ];

  return (
    <section className="py-6 sm:py-10 border-b border-gray-100">
      <div className="container-custom">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              href={`/search?type=${cat.value}`}
              className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-[68px] sm:min-w-[80px] group"
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform duration-200 shadow-sm`}
              >
                <cat.Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-primary-600 transition-colors whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
