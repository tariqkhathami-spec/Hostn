'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/listings/PropertyCard';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { CITIES } from '@/lib/constants';
import Link from 'next/link';
import { Search, MapPin, Calendar, Users, SlidersHorizontal, X, ChevronDown, Minus, Plus } from 'lucide-react';
import { Property } from '@/types';
import MiniCalendar from '@/components/ui/MiniCalendar';
import { format } from 'date-fns';

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
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  // Guest picker state
  const initGuests = Number(searchParams.get('guests') || 0);
  const [adults, setAdults] = useState(initGuests > 0 ? Math.max(1, initGuests) : 1);
  const [children, setChildren] = useState(0);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  // Refs
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLDivElement>(null);
  const calendarPopupRef = useRef<HTMLDivElement>(null);
  const guestPickerRef = useRef<HTMLDivElement>(null);

  // Initialize city search text from URL
  useEffect(() => {
    if (searchCity) {
      const found = CITIES.find((c) => c.value === searchCity);
      if (found) setCitySearch(isAr ? found.ar : found.en);
      else setCitySearch(searchCity);
    }
  }, []);

  // Filter cities
  const filteredCities = CITIES.filter((c) => {
    const q = citySearch.toLowerCase();
    return !q || c.en.toLowerCase().includes(q) || c.ar.includes(q);
  });

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setShowCityDropdown(false);
      }
      if (
        calendarTriggerRef.current && !calendarTriggerRef.current.contains(target) &&
        calendarPopupRef.current && !calendarPopupRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
      if (guestPickerRef.current && !guestPickerRef.current.contains(target)) {
        setShowGuestPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync guests total to state
  useEffect(() => {
    const total = adults + children;
    setGuests(total > 0 ? String(total) : '');
  }, [adults, children]);

  // Calendar date handler
  const handleDateSelect = useCallback((dateStr: string) => {
    if (!selectingCheckOut) {
      setCheckIn(dateStr);
      setCheckOut('');
      setSelectingCheckOut(true);
    } else {
      if (dateStr > checkIn) {
        setCheckOut(dateStr);
        setSelectingCheckOut(false);
        setShowCalendar(false);
      } else {
        setCheckIn(dateStr);
        setCheckOut('');
      }
    }
  }, [selectingCheckOut, checkIn]);

  // Format date display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isAr
      ? date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
      : format(date, 'MMM d');
  };

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
              {/* City — searchable dropdown */}
              <div className="relative" ref={cityDropdownRef}>
                <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setSearchCity('');
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  placeholder={isAr ? 'ابحث عن مدينة...' : 'Search city...'}
                  className="w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                />
                <ChevronDown className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                {showCityDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setSearchCity(''); setCitySearch(''); setShowCityDropdown(false); }}
                      className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${!searchCity ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-primary-50'}`}
                    >
                      {isAr ? 'جميع المدن' : 'All cities'}
                    </button>
                    {filteredCities.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setSearchCity(c.value);
                          setCitySearch(isAr ? c.ar : c.en);
                          setShowCityDropdown(false);
                        }}
                        className={`w-full text-start px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                          searchCity === c.value
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {isAr ? c.ar : c.en}
                      </button>
                    ))}
                    {filteredCities.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {isAr ? 'لا توجد نتائج' : 'No results'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dates — calendar trigger */}
              <div className="relative lg:col-span-2" ref={calendarTriggerRef}>
                <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendar(!showCalendar);
                    if (!showCalendar && !checkIn) setSelectingCheckOut(false);
                  }}
                  className={`w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border rounded-xl text-sm text-start transition-all bg-white ${
                    showCalendar ? 'border-primary-400 ring-2 ring-primary-400/40' : 'border-gray-200'
                  }`}
                >
                  <span className={checkIn ? 'text-gray-800' : 'text-gray-400'}>
                    {checkIn && checkOut
                      ? `${formatDateDisplay(checkIn)} — ${formatDateDisplay(checkOut)}`
                      : checkIn
                        ? `${formatDateDisplay(checkIn)} — ...`
                        : isAr ? 'تاريخ الوصول — المغادرة' : 'Check-in — Check-out'
                    }
                  </span>
                </button>
              </div>

              {/* Guests — picker dropdown */}
              <div className="relative" ref={guestPickerRef}>
                <Users className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <button
                  type="button"
                  onClick={() => setShowGuestPicker(!showGuestPicker)}
                  className={`w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-2.5 border rounded-xl text-sm text-start transition-all bg-white ${
                    showGuestPicker ? 'border-primary-400 ring-2 ring-primary-400/40' : 'border-gray-200'
                  }`}
                >
                  <span className={guests ? 'text-gray-800' : 'text-gray-400'}>
                    {guests
                      ? isAr
                        ? `${adults} بالغ${children > 0 ? ` · ${children} طفل` : ''}`
                        : `${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? ` · ${children} Child${children > 1 ? 'ren' : ''}` : ''}`
                      : isAr ? 'عدد الضيوف' : 'Guests'
                    }
                  </span>
                </button>
                <ChevronDown className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform ${showGuestPicker ? 'rotate-180' : ''}`} />
                {showGuestPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[220px]">
                    {/* Adults */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{isAr ? 'بالغين' : 'Adults'}</div>
                        <div className="text-xs text-gray-400">{isAr ? '13 سنة فأكثر' : 'Ages 13+'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdults((a) => Math.max(1, a - 1))}
                          disabled={adults <= 1}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults((a) => Math.min(16, a + 1))}
                          disabled={adults >= 16}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Children */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{isAr ? 'أطفال' : 'Children'}</div>
                        <div className="text-xs text-gray-400">{isAr ? '0–12 سنة' : 'Ages 0–12'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChildren((c) => Math.max(0, c - 1))}
                          disabled={children <= 0}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren((c) => Math.min(10, c + 1))}
                          disabled={children >= 10}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* Calendar portal — matches homepage style */}
      {showCalendar && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/20 sm:bg-black/10 z-[998] animate-fade-in"
            onClick={() => setShowCalendar(false)}
          />
          <div
            ref={calendarPopupRef}
            className="fixed z-[999] bg-white shadow-2xl border border-gray-100
              bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up
              sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:animate-fade-in-up sm:w-[340px] md:w-[620px]
              max-h-[80vh] overflow-y-auto"
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-primary-600">
                {selectingCheckOut
                  ? (isAr ? 'اختر تاريخ المغادرة' : 'Select check-out date')
                  : (isAr ? 'اختر تاريخ الوصول' : 'Select check-in date')
                }
              </p>
            </div>
            <div className="hidden md:block">
              <MiniCalendar checkIn={checkIn} checkOut={checkOut} onSelectDate={handleDateSelect} locale={isAr ? 'ar' : 'en'} dual />
            </div>
            <div className="md:hidden">
              <MiniCalendar checkIn={checkIn} checkOut={checkOut} onSelectDate={handleDateSelect} locale={isAr ? 'ar' : 'en'} />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
