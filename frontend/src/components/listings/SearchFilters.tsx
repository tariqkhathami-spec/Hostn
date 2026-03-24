'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const CITIES = [
  { value: 'Riyadh', en: 'Riyadh', ar: '\u0627\u0644\u0631\u064A\u0627\u0636' },
  { value: 'Jeddah', en: 'Jeddah', ar: '\u062C\u062F\u0629' },
  { value: 'Abha', en: 'Abha', ar: '\u0623\u0628\u0647\u0627' },
  { value: 'Khobar', en: 'Khobar', ar: '\u0627\u0644\u062E\u0628\u0631' },
  { value: 'Taif', en: 'Taif', ar: '\u0627\u0644\u0637\u0627\u0626\u0641' },
  { value: 'Al Ula', en: 'Al Ula', ar: '\u0627\u0644\u0639\u0644\u0627' },
  { value: 'Hail', en: 'Hail', ar: '\u062D\u0627\u0626\u0644' },
  { value: 'Mecca', en: 'Mecca', ar: '\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629' },
];

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [showFilters, setShowFilters] = useState(false);

  const PROPERTY_TYPES = [
    { label: t('filters.allTypes'), value: '' },
    { label: t('type.chalets'), value: 'chalet' },
    { label: t('type.apartments'), value: 'apartment' },
    { label: t('type.villas'), value: 'villa' },
    { label: t('type.studios'), value: 'studio' },
    { label: t('type.farms'), value: 'farm' },
    { label: t('type.camps'), value: 'camp' },
    { label: t('type.hotels'), value: 'hotel' },
  ];

  const SORT_OPTIONS = [
    { label: t('filters.topRated'), value: '-ratings.average' },
    { label: t('filters.priceLow'), value: 'pricing.perNight' },
    { label: t('filters.priceHigh'), value: '-pricing.perNight' },
    { label: t('filters.newest'), value: '-createdAt' },
  ];

  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    type: searchParams.get('type') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: searchParams.get('guests') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || '-ratings.average',
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/listings?${params.toString()}`);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      type: '',
      checkIn: '',
      checkOut: '',
      guests: '',
      minPrice: '',
      maxPrice: '',
      sort: '-ratings.average',
    });
    router.push('/listings');
  };

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sort'
  ).length;

  return (
    <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="container-custom py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all ${
              activeCount > 0
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('filters.title')}
            {activeCount > 0 && (
              <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Quick type filters */}
          {PROPERTY_TYPES.slice(0, 6).map((pt) => (
            <button
              key={pt.value}
              onClick={() => {
                const newFilters = { ...filters, type: pt.value };
                setFilters(newFilters);
                const params = new URLSearchParams();
                Object.entries(newFilters).forEach(([k, v]) => {
                  if (v) params.set(k, v);
                });
                router.push(`/listings?${params.toString()}`);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                filters.type === pt.value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {pt.label}
            </button>
          ))}

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => {
              const newFilters = { ...filters, sort: e.target.value };
              setFilters(newFilters);
              const params = new URLSearchParams();
              Object.entries(newFilters).forEach(([k, v]) => {
                if (v) params.set(k, v);
              });
              router.push(`/listingsw${params.toString()}`);
            }}
            className="ltr:ml-auto rtl:mr-auto px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 whitespace-nowrap"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              {t('filters.clearAll')}
            </button>
          )}
        </div>

        {/* Expanded fil&& (
          <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-200 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.city')}</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">{t('filters.allCities')}</option>
                  {CITIES.map((c) => <option key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.guests')}</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={filters.guests}
                  onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
                  placeholder="Any"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.minPrice')}</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.maxPrice')}</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="10000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.checkIn')}</label>
                <input
                  type="date"
                  value={filters.checkIn}
                  onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('filters.checkOut')}</label>
                <input
                  type="date"
                  value={filters.checkOut}
                  onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={clearFilters} className="btn-ghost text-sm">{t('filters.clearAll')}</button>
              <button onClick={applyFilters} className="btn-primary text-sm py-2.5 px-6">
                {t('filters.apply')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
