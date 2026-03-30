'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/listings/PropertyCard';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { CITIES } from '@/lib/constants';
import Link from 'next/link';
import { Search, MapPin, Calendar, Users, SlidersHorizontal, X } from 'lucide-react';
import { Property } from '@/types';

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Search state — initialize from URL
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchCity) params.city = searchCity;
      if (selectedType) params.type = selectedType;
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);
      if (guests) params.guests = Number(guests);
      const res = await propertiesApi.getAll(params);
      setProperties(res.data.properties || res.data.data || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Update URL when searching
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (selectedType) params.set('type', selectedType);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (guests) params.set('guests', guests);
    router.push(`/listings?${params.toString()}`);
    fetchProperties();
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setGuests('');
    setCheckIn('');
    setCheckOut('');
    setShowFilters(false);
  };

  const hasActiveFilters = !!(minPrice || maxPrice || guests || checkIn || checkOut);

  useEffect(() => {
    fetchProperties();
  }, [selectedType]);

  const types = [
    { key: '', label: { en: 'All', ar: 'الكل' } },
    { key: 'chalet', label: { en: 'Chalets', ar: 'شاليهات' } },
    { key: 'villa', label: { en: 'Villas', ar: 'فلل' } },
    { key: 'apartment', label: { en: 'Apartments', ar: 'شقق' } },
    { key: 'farm', label: { en: 'Farms', ar: 'مزارع' } },
    { key: 'camp', label: { en: 'Camps', ar: 'مخيمات' } },
    { key: 'hotel', label: { en: 'Hotels', ar: 'فنادق' } },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary-600 transition-colors">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-700">{isAr ? 'العقارات' : 'Properties'}</span>
            {searchCity && (
              <>
                <span className="mx-1.5">/</span>
                <span className="text-gray-700">{searchCity}</span>
              </>
            )}
          </nav>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* City */}
              <div className="relative">
                <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">{isAr ? 'جميع المدن' : 'All cities'}</option>
                  {CITIES.map((c) => (
                    <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>
                  ))}
                </select>
              </div>

              {/* Check-in */}
              <div className="relative">
                <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  placeholder={isAr ? 'تاريخ الوصول' : 'Check-in'}
                  className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {/* Check-out */}
              <div className="relative">
                <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || undefined}
                  placeholder={isAr ? 'تاريخ المغادرة' : 'Check-out'}
                  className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {/* Guests */}
              <div className="relative">
                <Users className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder={isAr ? 'عدد الضيوف' : 'Guests'}
                  className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {/* Search button */}
              <div className="flex gap-2">
                <button onClick={handleSearch} className="flex-1 btn-primary flex items-center justify-center gap-2 rounded-xl">
                  <Search className="w-4 h-4" />
                  {isAr ? 'بحث' : 'Search'}
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    hasActiveFilters ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                  title={isAr ? 'فلاتر إضافية' : 'More filters'}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{isAr ? 'فلاتر إضافية' : 'Additional Filters'}</h3>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {isAr ? 'مسح الفلاتر' : 'Clear filters'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {isAr ? 'أقل سعر (ر.س)' : 'Min Price (SAR)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {isAr ? 'أعلى سعر (ر.س)' : 'Max Price (SAR)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleSearch} className="w-full btn-primary rounded-xl py-2 text-sm">
                      {isAr ? 'تطبيق الفلاتر' : 'Apply Filters'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {types.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {label[lang]}
              </button>
            ))}
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-sm text-gray-500 mb-4">
              {isAr
                ? `${properties.length} عقار`
                : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`
              }
            </p>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {isAr ? 'لا توجد عقارات' : 'No properties found'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {isAr ? 'حاول تعديل معايير البحث' : 'Try adjusting your search criteria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property._id} property={property} checkIn={checkIn} checkOut={checkOut} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
