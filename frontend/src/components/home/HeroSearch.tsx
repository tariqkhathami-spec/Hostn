'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, ChevronDown, Star, Shield, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';

const CITIES = [
  { value: 'Riyadh', en: 'Riyadh', ar: 'الرياض' },
  { value: 'Jeddah', en: 'Jeddah', ar: 'جدة' },
  { value: 'Abha', en: 'Abha', ar: 'أبها' },
  { value: 'Khobar', en: 'Khobar', ar: 'الخبر' },
  { value: 'Taif', en: 'Taif', ar: 'الطائف' },
  { value: 'Al Ula', en: 'Al Ula', ar: 'العلا' },
  { value: 'Hail', en: 'Hail', ar: 'حائل' },
  { value: 'Mecca', en: 'Mecca', ar: 'مكة المكرمة' },
];

export default function HeroSearch() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const PROPERTY_TYPES = [
    { label: t('hero.allTypes'), value: '' },
    { label: t('type.chalets'), value: 'chalet' },
    { label: t('type.apartments'), value: 'apartment' },
    { label: t('type.villas'), value: 'villa' },
    { label: t('type.studios'), value: 'studio' },
    { label: t('type.farms'), value: 'farm' },
    { label: t('type.camps'), value: 'camp' },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (propertyType) params.set('type', propertyType);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', guests.toString());
    router.push(`/listings?${params.toString()}`);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  return (
    <div className="relative min-h-[520px] sm:min-h-[600px] md:min-h-[720px] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600)',
          }}
        />
        {/* Cinematic gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(26,14,46,0.95) 0%, rgba(59,21,120,0.88) 35%, rgba(109,40,217,0.72) 70%, rgba(109,40,217,0.55) 100%)',
          }}
        />
      </div>

      {/* Decorative orbs - hidden on small screens for performance */}
      <div className="hidden sm:block absolute top-20 left-10 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl animate-pulse-soft pointer-events-none" />
      <div className="hidden sm:block absolute bottom-20 right-10 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '1.5s' }} />

      {/* Content */}
      <div className="relative z-10 container-custom text-center py-10 sm:py-16 md:py-20 px-4 sm:px-6">
        {/* Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <span className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs sm:text-sm font-medium px-3 sm:px-5 py-1.5 sm:py-2 rounded-full backdrop-blur-md border border-white/10">
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse-soft" />
            {t('hero.badge')}
          </span>
        </div>

        {/* Headline */}
        <div className="animate-fade-in-up mt-6" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-white mb-3 sm:mb-5 leading-[1.1] tracking-tight">
            {t('hero.title1')}
            <br />
            <span className="font-display italic text-gradient-gold inline-block mt-1">
              {t('hero.title2')}
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/70 mb-6 sm:mb-10 max-w-xl mx-auto leading-relaxed font-light px-2 sm:px-0">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Glass search box */}
        <div
          className="animate-fade-in-up max-w-4xl mx-auto"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 md:p-5 border border-white/40">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
              {/* City */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.destination')}
                </label>
                <div className="relative">
                  <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-3 border border-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="">{t('hero.selectCity')}</option>
                    {CITIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {language === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Type */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.propertyType')}
                </label>
                <div className="relative">
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 appearance-none cursor-pointer transition-all duration-200"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Check-in */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.checkIn')}
                </label>
                <div className="relative">
                  <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-3 border border-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.checkOut')}
                </label>
                <div className="relative">
                  <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || tomorrow}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-3 border border-gray-100 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Search button */}
              <div className="flex flex-col justify-end col-span-2 md:col-span-1">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1 md:opacity-0">
                  {t('hero.search')}
                </label>
                <button
                  onClick={handleSearch}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5"
                >
                  <Search className="w-4 h-4" />
                  {t('hero.search')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick city links */}
        <div
          className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          {CITIES.slice(0, 6).map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCity(c.value);
                router.push(`/listings?city=${c.value}`);
              }}
              className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-sm transition-all duration-300 border border-white/5 hover:border-white/15"
            >
              {language === 'ar' ? c.ar : c.en}
            </button>
          ))}
        </div>

        {/* Trust indicators */}
        <div
          className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10 mt-6 sm:mt-10 animate-fade-in-up"
          style={{ animationDelay: '0.65s' }}
        >
          {[
            { icon: Shield, label: t('hero.trustedStays') },
            { icon: Star, label: t('hero.guestReviewed') },
            { icon: Award, label: t('hero.support24') },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-white/60"
            >
              <Icon className="w-4 h-4 text-gold-400" />
              <span className="text-xs font-medium tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
