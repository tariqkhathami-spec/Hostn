'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Shield, Star, Headphones, Home, Building, TreePine, Tent, Hotel } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PROPERTY_TYPES = [
  { key: 'chalet', icon: Home, label: { en: 'Chalets', ar: 'شاليهات' } },
  { key: 'villa', icon: Building, label: { en: 'Villas', ar: 'فلل' } },
  { key: 'apartment', icon: Building, label: { en: 'Apartments', ar: 'شقق' } },
  { key: 'farm', icon: TreePine, label: { en: 'Farms', ar: 'مزارع' } },
  { key: 'camp', icon: Tent, label: { en: 'Camps', ar: 'مخيمات' } },
  { key: 'hotel', icon: Hotel, label: { en: 'Hotels', ar: 'فنادق' } },
];

export default function HomePage() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const lang = language as 'en' | 'ar';
  const [searchCity, setSearchCity] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm mb-6">
            <Star className="w-4 h-4 text-gold-400" />
            {t('hero.badge')}
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
            {t('hero.title1')}<br />
            <span className="text-gold-400">{t('hero.title2')}</span>
          </h1>

          <p className="text-lg text-primary-200 max-w-2xl mx-auto mb-10">
            {t('hero.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto flex gap-3">
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث عن مدينة...' : 'Search by city...'}
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-5 py-3.5 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
            <button
              onClick={handleSearch}
              className="bg-gold-500 hover:bg-gold-400 text-primary-950 px-6 py-3.5 rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {t('hero.search')}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex justify-center gap-8 mt-10 text-sm text-primary-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold-400" />
              {t('hero.verified')}
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gold-400" />
              {t('hero.rating')}
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-gold-400" />
              {t('hero.support')}
            </div>
          </div>
        </div>
      </section>

      {/* Property Types */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            {lang === 'ar' ? 'تصفح حسب النوع' : 'Browse by Type'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {PROPERTY_TYPES.map(({ key, icon: Icon, label }) => (
              <Link
                key={key}
                href={`/listings?type=${key}`}
                className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl hover:bg-primary-50 hover:border-primary-200 border-2 border-transparent transition-all"
              >
                <Icon className="w-8 h-8 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">{label[lang]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Hostn */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('why.title')}</h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">{t('why.subtitle')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: t('why.verified'), desc: t('why.verifiedDesc') },
              { icon: Star, title: t('why.reviews'), desc: t('why.reviewsDesc') },
              { icon: Headphones, title: t('why.support'), desc: t('why.supportDesc') },
              { icon: Search, title: t('why.payments'), desc: t('why.paymentsDesc') },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-900 text-white text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">{t('cta.title')}</h2>
          <p className="text-primary-200 mb-8">{t('cta.subtitle')}</p>
          <Link
            href="/auth/host/register"
            className="inline-block bg-gold-500 hover:bg-gold-400 text-primary-950 px-8 py-3.5 rounded-xl font-bold transition-colors"
          >
            {t('nav.becomeHost')}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
