'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeaturedListings from '@/components/home/FeaturedListings';
import HeroSearch from '@/components/home/HeroSearch';
import { useLanguage } from '@/context/LanguageContext';
import {
  Search,
  ShieldCheck,
  Star,
  Headphones,
  Home,
  Building,
  Building2,
  TreePine,
  Tent,
  Hotel,
  Users,
  CheckCircle,
  CalendarCheck,
  KeyRound,
  Wallet,
  BedDouble,
  Sofa,
  ArrowLeft,
  ArrowRight,
  MapPin,
  BadgeCheck,
  BarChart3,
  Smartphone,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { propertiesApi } from '@/lib/api';
import { saveSearchCookies } from '@/lib/searchCookies';
import { hostPortalUrl } from '@/lib/hostPortal';

const PROPERTY_TYPES = [
  { key: 'chalet', icon: Home, label: { en: 'Chalets', ar: 'شاليهات' } },
  { key: 'rest_house', icon: Sofa, label: { en: 'Rest Houses', ar: 'استراحات' } },
  { key: 'villa', icon: Building2, label: { en: 'Villas', ar: 'فلل' } },
  { key: 'farm', icon: TreePine, label: { en: 'Farms', ar: 'مزارع' } },
  { key: 'camp', icon: Tent, label: { en: 'Camps', ar: 'مخيمات' } },
  { key: 'apartment', icon: Building, label: { en: 'Apartments', ar: 'شقق' } },
  { key: 'serviced_apartment', icon: KeyRound, label: { en: 'Serviced Apartments', ar: 'شقق مفروشة' } },
  { key: 'hotel_resort', icon: Hotel, label: { en: 'Resorts', ar: 'منتجعات' } },
  { key: 'studio', icon: BedDouble, label: { en: 'Studios', ar: 'استوديوهات' } },
  { key: 'room', icon: BedDouble, label: { en: 'Rooms', ar: 'غرف' } },
];

const CITIES = [
  { value: 'Riyadh', en: 'Riyadh', ar: 'الرياض', tag: { en: 'The capital', ar: 'العاصمة' } },
  { value: 'Jeddah', en: 'Jeddah', ar: 'جدة', tag: { en: 'Red Sea coast', ar: 'عروس البحر' } },
  { value: 'Abha', en: 'Abha', ar: 'أبها', tag: { en: 'Cool highlands', ar: 'أجواء الجنوب' } },
  { value: 'Taif', en: 'Taif', ar: 'الطائف', tag: { en: 'City of roses', ar: 'مدينة الورد' } },
  { value: 'Khobar', en: 'Khobar', ar: 'الخبر', tag: { en: 'Gulf waterfront', ar: 'واجهة الخليج' } },
  { value: 'Al Ula', en: 'AlUla', ar: 'العلا', tag: { en: 'Desert heritage', ar: 'تاريخ وصحراء' } },
];

export default function HomePage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const [stats, setStats] = useState<{ properties: number; hosts: number; completedBookings: number; reviews: number } | null>(null);

  useEffect(() => {
    propertiesApi.getPublicStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const goToCity = (city: string) => {
    saveSearchCookies({
      city,
      checkIn: format(new Date(), 'yyyy-MM-dd'),
      checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    });
    router.push('/search');
  };

  const goToType = (type: string) => {
    saveSearchCookies({ type });
    router.push('/search');
  };

  const steps = [
    {
      icon: Search,
      title: isAr ? 'ابحث' : 'Search',
      desc: isAr ? 'اختر المدينة والتاريخ ونوع المكان، وشف المتاح فوراً.' : 'Pick the city, dates and type of place, and see what is available.',
    },
    {
      icon: CalendarCheck,
      title: isAr ? 'احجز' : 'Book',
      desc: isAr ? 'السعر النهائي واضح قبل الدفع: الإيجار والرسوم والضريبة.' : 'The final price is clear before you pay: rent, fees and VAT.',
    },
    {
      icon: KeyRound,
      title: isAr ? 'استمتع' : 'Enjoy',
      desc: isAr ? 'يوصلك تأكيد الحجز وتفاصيل الوصول، وتواصل مع المضيف مباشرة.' : 'Get your confirmation and arrival details, and message the host directly.',
    },
  ];

  const reasons = [
    { icon: ShieldCheck, title: t('why.verified'), desc: t('why.verifiedDesc') },
    { icon: Star, title: t('why.reviews'), desc: t('why.reviewsDesc') },
    { icon: Headphones, title: t('why.support'), desc: t('why.supportDesc') },
    { icon: Wallet, title: t('why.payments'), desc: t('why.paymentsDesc') },
  ];

  const hostPoints = [
    { icon: Smartphone, text: isAr ? 'تطبيق خاص للمضيف يدير الحجوزات والتقويم' : 'A dedicated host app for bookings and calendar' },
    { icon: BarChart3, text: isAr ? 'تحكم كامل في الأسعار والعروض والخصومات' : 'Full control of prices, offers and discounts' },
    { icon: BadgeCheck, text: isAr ? 'كشوفات ومستحقات واضحة لكل حجز' : 'Clear statements and payouts for every booking' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <HeroSearch />

      {/* Platform stats — shown only when there is real volume to show */}
      {stats && stats.properties >= 30 && (
        <section className="bg-primary-950 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                { value: stats.properties, label: isAr ? 'عقار متاح' : 'Properties', icon: Home },
                { value: stats.hosts, label: isAr ? 'مضيف موثّق' : 'Verified hosts', icon: Users },
                { value: stats.completedBookings, label: isAr ? 'حجز مكتمل' : 'Completed bookings', icon: CheckCircle },
                { value: stats.reviews, label: isAr ? 'تقييم' : 'Guest reviews', icon: Star },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label}>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString('en')}
                    <span className="text-gold-400">+</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-primary-200">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by type */}
      <section className="py-14 sm:py-20">
        <div className="container-custom">
          <SectionHeading
            kicker={isAr ? 'وش تدوّر عليه؟' : 'What are you looking for?'}
            title={isAr ? 'تصفّح حسب نوع المكان' : 'Browse by type of place'}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {PROPERTY_TYPES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => goToType(key)}
                className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-600 hover:shadow-premium"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{label[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <div className="bg-gray-50">
        <FeaturedListings
          title={isAr ? 'أماكن عليها الطلب' : 'Popular right now'}
          subtitle={isAr ? 'اختيارات جاهزة لإجازتك الجاية' : 'Ready picks for your next getaway'}
        />
      </div>

      {/* Destinations */}
      <section className="py-14 sm:py-20">
        <div className="container-custom">
          <SectionHeading
            kicker={isAr ? 'وين ودّك تروح؟' : 'Where to?'}
            title={isAr ? 'وجهات يحبّها ضيوفنا' : 'Destinations our guests love'}
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {CITIES.map((city, i) => (
              <button
                key={city.value}
                onClick={() => goToCity(city.value)}
                className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-start text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg ${
                  i % 3 === 0 ? 'bg-primary-900' : i % 3 === 1 ? 'bg-primary-800' : 'bg-primary-700'
                }`}
              >
                <span className="pointer-events-none absolute -top-10 ltr:-right-10 rtl:-left-10 h-40 w-40 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-125" />
                <span className="pointer-events-none absolute -bottom-12 ltr:-left-8 rtl:-right-8 h-32 w-32 rounded-full bg-gold-400/10" />
                <span className="relative flex items-center gap-1.5 text-xs sm:text-sm text-primary-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {city.tag[lang]}
                </span>
                <span className="relative mt-2 block text-2xl sm:text-4xl font-extrabold">{city[lang]}</span>
                <span className="relative mt-4 sm:mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300">
                  {isAr ? 'شف المتاح' : 'See stays'}
                  <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="container-custom">
          <SectionHeading
            kicker={isAr ? 'ثلاث خطوات' : 'Three steps'}
            title={isAr ? 'من البحث إلى المفتاح' : 'From search to keys'}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative rounded-3xl bg-white p-7 shadow-card">
                <span className="absolute top-6 ltr:right-7 rtl:left-7 text-6xl font-extrabold text-primary-50 tabular-nums select-none">
                  {i + 1}
                </span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-700 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="relative mt-5 text-xl font-bold text-gray-900">{title}</h3>
                <p className="relative mt-2 text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Hostn */}
      <section className="py-14 sm:py-20 bg-primary-950 text-white">
        <div className="container-custom">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-gold-400">{isAr ? 'راحة بالك أولاً' : 'Peace of mind first'}</p>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">{t('why.title')}</h2>
            <p className="mt-4 text-base sm:text-lg text-primary-200 leading-relaxed">{t('why.subtitle')}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {reasons.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                <Icon className="h-7 w-7 text-gold-400" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm text-primary-200 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host call to action */}
      <section className="py-14 sm:py-20">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl bg-gray-50 border border-gray-100">
            <div className="p-7 sm:p-12 flex flex-col justify-center">
              <p className="text-sm font-semibold text-primary-700">{isAr ? 'لأصحاب العقارات' : 'For property owners'}</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">{t('cta.title')}</h2>
              <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">{t('cta.subtitle')}</p>
              <ul className="mt-6 space-y-3">
                {hostPoints.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-gray-800">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <a
                  href={hostPortalUrl('/auth')}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 px-8 py-4 text-base font-bold text-primary-950 shadow-gold transition-all duration-300 hover:-translate-y-0.5 hover:from-gold-400 hover:to-gold-300"
                >
                  {t('cta.button')}
                  <Arrow className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div
              className="min-h-[240px] lg:min-h-[460px] bg-cover bg-center"
              style={{ backgroundImage: 'url(/brand/host.jpg)' }}
              role="img"
              aria-label={isAr ? 'فيلا بمسبح' : 'Villa with a pool'}
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8 sm:mb-10">
      <p className="text-sm font-semibold text-primary-700">{kicker}</p>
      <h2 className="mt-1.5 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">{title}</h2>
    </div>
  );
}
