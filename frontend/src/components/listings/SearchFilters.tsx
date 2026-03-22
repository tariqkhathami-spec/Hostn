'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const PROPERTY_TYPES = [
  { label: 'All', value: '' },
  { label: 'Chalet', value: 'chalet' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Villa', value: 'villa' },
  { label: 'Studio', value: 'studio' },
  { label: 'Farm', value: 'farm' },
  { label: 'Camp', value: 'camp' },
  { label: 'Hotel', value: 'hotel' },
];

const CITIES = [
  'Riyadh', 'Jeddah', 'Abha', 'Khobar', 'Taif', 'Al Ula', 'Hail', 'Mecca',
];

const SORT_OPTIONS = [
  { label: 'Top Rated', value: '-ratings.average' },
  { label: 'Price: Low to High', value: 'pricing.perNight' },
  { label: 'Price: High to Low', value: '-pricing.perNight' },
  { label: 'Newest', value: '-createdAt' },
];

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

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
            Filters
            {activeCount > 0 && (
              <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Quick type filters */}
          {PROPERTY_TYPES.slice(0, 6).map((t) => (
            <button
              key={t.value}
              onClick={() => {
                const newFilters = { ...filters, type: t.value };
                setFilters(newFilters);
                const params = new URLSearchParams();
                Object.entries(newFilters).forEach(([k, v]) => {
                  if (v) params.set(k, v);
                });
                router.push(`/listings?${params.toString()}`);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                filters.type === t.value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t.label}
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
              router.push(`/listings?${params.toString()}`);
            }}
            className="ml-auto px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 whitespace-nowrap"
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
              Clear
            </button>
          )}
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-200 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">All cities</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Guests</label>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Price (SAR/night)</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max Price (SAR/night)</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="10000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Check-in</label>
                <input
                  type="date"
                  value={filters.checkIn}
                  onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Check-out</label>
                <input
                  type="date"
                  value={filters.checkOut}
                  onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={clearFilters} className="btn-ghost text-sm">Clear all</button>
              <button onClick={applyFilters} className="btn-primary text-sm py-2.5 px-6">
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
