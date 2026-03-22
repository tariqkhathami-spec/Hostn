'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSearch from '@/components/home/HeroSearch';
import CategoryNav from '@/components/home/CategoryNav';
import FeaturedListings from '@/components/home/FeaturedListings';
import CityBrowse from '@/components/home/CityBrowse';
import WhyHostn from '@/components/home/WhyHostn';
import { useLanguage } from '@/context/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <Header />
      <main>
        <HeroSearch />
        <CategoryNav />
        <FeaturedListings
          title={t('featured.viewAll')}
          subtitle=""
          featured={true}
        />
        <CityBrowse />
        <FeaturedListings
          title={t('featured.viewAll')}
          subtitle=""
          city="Riyadh"
        />
        <WhyHostn />

        {/* CTA Banner */}
        <section className="py-10 sm:py-16 bg-gradient-to-r from-primary-600 to-primary-800">
          <div className="container-custom text-center px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-primary-200 mb-6 sm:mb-8 max-w-lg mx-auto text-sm sm:text-lg">
              {t('cta.subtitle')}
            </p>
            <a
              href="/auth/register?role=host"
              className="inline-block bg-white text-primary-700 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-primary-50 transition-all duration-200 shadow-xl text-sm sm:text-base"
            >
              {t('cta.button')}
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
