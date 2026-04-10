'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

const cities = [
  {
    value: 'Riyadh',
    en: 'Riyadh',
    ar: 'الرياض',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=400',
  },
  {
    value: 'Jeddah',
    en: 'Jeddah',
    ar: 'جدة',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
  },
  {
    value: 'Abha',
    en: 'Abha',
    ar: 'أبها',
    image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=400',
  },
  {
    value: 'Al Ula',
    en: 'Al Ula',
    ar: 'العلا',
    image: 'https://images.unsplash.com/photo-1565534416698-4e9e2c8dae95?w=400',
  },
  {
    value: 'Khobar',
    en: 'Khobar',
    ar: 'الخبر',
    image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=400',
  },
  {
    value: 'Taif',
    en: 'Taif',
    ar: 'الطائف',
    image: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400',
  },
  {
    value: 'Dammam',
    en: 'Dammam',
    ar: 'الدمام',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=400&q=80&fit=crop',
  },
];

export default function CityBrowse() {
  const { t, language } = useLanguage();

  return (
    <section className="py-8 sm:py-14 bg-gray-50">
      <div className="container-custom">
        <div className="mb-5 sm:mb-8">
          <h2 className="section-title mb-1">{t('cities.title')}</h2>
          <p className="text-gray-500 text-xs sm:text-sm">{t('cities.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {cities.map((city) => (
            <Link
              key={city.value}
              href={`/search?city=${city.value}`}
              className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                style={{ backgroundImage: `url(${city.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="font-bold text-sm">{language === 'ar' ? city.ar : city.en}</p>
                <p className="text-xs text-white/80">{t('cities.exploreStays')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
