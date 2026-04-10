'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeaturedListings from '@/components/home/FeaturedListings';
import HeroSearch from '@/components/home/HeroSearch';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Shield, Star, Headphones, Home, Building, TreePine, Tent, Hotel, Users, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { propertiesApi } from '@/lib/api';
import { saveSearchCookies } from '@/lib/searchCookies';

const PROPERTY_TYPES = [
  { key: 'chalet', icon: Home, label: { en: 'Chalets', ar: 'شاليهات' } },
  { key: 'villa', icon: Building, label: { en: 'Villas', ar: 'فلل' } },
  { key: 'apartment', icon: Building, label: { en: 'Apartments', ar: 'شقق' } },
  { key: 'farm', icon: TreePine, label: { en: 'Farms', ar: 'مزارع' } },
  { key: 'camp', icon: Tent, label: { en: 'Camps', ar: 'مخيمات' } },
  { key: 'hotel', icon: Hotel, label: { en: 'Hotels', ar: 'فنادق' } },
];

export default function HomePage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const lang = language as 'en' | 'ar';
  const [stats, setStats] = useState<{ properties: number; hosts: number; completedBookings: number; reviews: number } | null>(null);

  useEffect(() => {
    propertiesApi.getPublicStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section with Search */}
      <HeroSearch />

      {/* Property Types */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            {lang === 'ar' ? 'تصفح حسب النوع' : 'Browse by Type'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {PROPERTY_TYPES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => {
                  saveSearchCookies({ type: key });
                  router.push('/search');
                }}
                className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl hover:bg-primary-50 hover:border-primary-200 border-2 border-transparent transition-all"
              >
                <Icon className="w-8 h-8 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">{label[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <FeaturedListings
        title={lang === 'ar' ? 'إقامات مميزة' : 'Featured Stays'}
        subtitle={lang === 'ar' ? 'عقارات مختارة لعطلتك القادمة' : 'Handpicked properties for your next getaway'}
      />

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

      {/* Platform Stats */}
      {stats && stats.properties >= 10 && (
        <section className="py-14 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                { value: stats.properties, label: lang === 'ar' ? 'عقار متاح' : 'Properties', icon: Home },
                { value: stats.hosts, label: lang === 'ar' ? 'مضيف موثوق' : 'Verified Hosts', icon: Users },
                { value: stats.completedBookings, label: lang === 'ar' ? 'حجز مكتمل' : 'Bookings Completed', icon: CheckCircle },
                { value: stats.reviews, label: lang === 'ar' ? 'تقييم' : 'Guest Reviews', icon: Star },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label}>
                  <Icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900">
                    {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString('en')}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-primary-900 text-white text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">{t('cta.title')}</h2>
          <p className="text-primary-200 mb-8">{t('cta.subtitle')}</p>
          <Link
            href="/auth"
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
