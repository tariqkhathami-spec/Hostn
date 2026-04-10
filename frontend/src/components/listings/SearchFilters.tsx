'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, MapPin, Calendar, Users, ChevronDown, Minus, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES } from '@/lib/constants';
import { getGuestLabel } from '@/lib/utils';
import MiniCalendar from '@/components/ui/MiniCalendar';

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
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

  // Dropdown states
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState(() => {
    const c = CITIES.find((c) => c.value === (searchParams.get('city') || ''));
    return c ? (isAr ? c.ar : c.en) : '';
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [adults, setAdults] = useState(Math.max(1, parseInt(searchParams.get('guests') || '1', 10)));
  const [children, setChildren] = useState(0);

  // Refs for click-outside
  const cityRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarPopupRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);

  const filteredCities = CITIES.filter((c) => {
    const q = citySearch.toLowerCase();
    return !q || c.en.toLowerCase().includes(q) || c.ar.includes(q);
  });

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cityRef.current && !cityRef.current.contains(target)) {
        setShowCityDropdown(false);
      }
      if (
        calendarRef.current && !calendarRef.current.contains(target) &&
        calendarPopupRef.current && !calendarPopupRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
      if (guestRef.current && !guestRef.current.contains(target)) {
        setShowGuestPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync total guests
  useEffect(() => {
    const total = adults + children;
    setFilters((f) => ({ ...f, guests: total > 1 ? String(total) : '' }));
  }, [adults, children]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/search?${params.toString()}`);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      city: '', type: '', checkIn: '', checkOut: '',
      guests: '', minPrice: '', maxPrice: '', sort: '-ratings.average',
    });
    setCitySearch('');
    setAdults(1);
    setChildren(0);
    router.push('/search');
  };

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sort'
  ).length;

  // Calendar date selection handler
  const handleDateSelect = (dateStr: string) => {
    if (!selectingCheckOut || !filters.checkIn) {
      setFilters((f) => ({ ...f, checkIn: dateStr, checkOut: '' }));
      setSelectingCheckOut(true);
    } else {
      if (dateStr > filters.checkIn) {
        setFilters((f) => ({ ...f, checkOut: dateStr }));
        setSelectingCheckOut(false);
        setShowCalendar(false);
      } else {
        setFilters((f) => ({ ...f, checkIn: dateStr, checkOut: '' }));
      }
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isAr
      ? date.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalGuests = adults + children;

  return (
    <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="container-custom py-2 sm:py-3">
        {/* Main search bar - styled like homepage */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* City dropdown */}
          <div className="relative flex-1 max-w-[200px]" ref={cityRef}>
            <div className="relative">
              <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setFilters((f) => ({ ...f, city: '' }));
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder={isAr ? 'المدينة' : 'City'}
                className={`w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 transition-all ${
                  showCityDropdown ? 'border-primary-300 ring-2 ring-primary-400/40' : 'border-gray-200'
                }`}
              />
              {showCityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto animate-fade-in-up">
                  <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    {isAr ? 'الوجهات' : 'Destinations'}
                  </div>
                  {filteredCities.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, city: c.value }));
                        setCitySearch(isAr ? c.ar : c.en);
                        setShowCityDropdown(false);
                      }}
                      className={`w-full text-start px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors min-h-[40px] ${
                        filters.city === c.value
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {isAr ? c.ar : c.en}
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">
                      {isAr ? 'لا توجد نتائج' : 'No results'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date picker */}
          <div className="relative flex-1 max-w-[220px]" ref={calendarRef}>
            <button
              type="button"
              onClick={() => {
                setShowCalendar(!showCalendar);
                if (!showCalendar && !filters.checkIn) setSelectingCheckOut(false);
              }}
              className={`w-full flex items-center gap-2 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border rounded-xl text-sm text-start transition-all bg-gray-50/50 ${
                showCalendar ? 'border-primary-300 ring-2 ring-primary-400/40' : 'border-gray-200'
              }`}
            >
              <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <span className={filters.checkIn ? 'text-gray-800' : 'text-gray-400'}>
                {filters.checkIn && filters.checkOut
                  ? `${formatDateDisplay(filters.checkIn)} — ${formatDateDisplay(filters.checkOut)}`
                  : filters.checkIn
                    ? `${formatDateDisplay(filters.checkIn)} — ...`
                    : isAr ? 'التاريخ' : 'Dates'
                }
              </span>
            </button>
          </div>

          {/* Guest picker */}
          <div className="relative flex-1 max-w-[180px]" ref={guestRef}>
            <button
              type="button"
              onClick={() => setShowGuestPicker(!showGuestPicker)}
              className={`w-full flex items-center gap-2 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border rounded-xl text-sm text-start transition-all bg-gray-50/50 ${
                showGuestPicker ? 'border-primary-300 ring-2 ring-primary-400/40' : 'border-gray-200'
              }`}
            >
              <Users className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <span className={totalGuests > 1 ? 'text-gray-800' : 'text-gray-400'}>
                {totalGuests > 1
                  ? getGuestLabel(totalGuests, isAr ? 'ar' : 'en')
                  : isAr ? 'الضيوف' : 'Guests'
                }
              </span>
              <ChevronDown className={`ltr:ml-auto rtl:mr-auto w-3.5 h-3.5 text-gray-400 transition-transform ${showGuestPicker ? 'rotate-180' : ''}`} />
            </button>

            {showGuestPicker && (
              <div className="absolute top-full ltr:left-0 rtl:right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-fade-in-up">
                {/* Adults */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{isAr ? 'بالغين' : 'Adults'}</p>
                    <p className="text-xs text-gray-400">{isAr ? '13 سنة فأكثر' : 'Ages 13+'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-gray-800 w-5 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(Math.min(20, adults + 1))}
                      disabled={adults >= 20}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{isAr ? 'أطفال' : 'Children'}</p>
                    <p className="text-xs text-gray-400">{isAr ? 'أقل من 13 سنة' : 'Ages 0–12'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-gray-800 w-5 text-center">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(10, children + 1))}
                      disabled={children >= 10}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Apply */}
                <button
                  type="button"
                  onClick={() => { setShowGuestPicker(false); applyFilters(); }}
                  className="w-full mt-3 bg-primary-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-primary-700 transition-colors"
                >
                  {isAr ? 'تطبيق' : 'Apply'}
                </button>
              </div>
            )}
          </div>

          {/* Search / Apply button */}
          <button
            onClick={applyFilters}
            className="bg-primary-600 text-white py-2.5 px-5 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('filters.apply')}
            {activeCount > 0 && (
              <span className="bg-white/20 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

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
              router.push(`/search?${params.toString()}`);
            }}
            className="hidden sm:block ltr:ml-auto rtl:mr-auto px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 whitespace-nowrap"
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

        {/* Quick type filters */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {PROPERTY_TYPES.slice(0, 8).map((pt) => (
            <button
              key={pt.value}
              onClick={() => {
                const newFilters = { ...filters, type: pt.value };
                setFilters(newFilters);
                const params = new URLSearchParams();
                Object.entries(newFilters).forEach(([k, v]) => {
                  if (v) params.set(k, v);
                });
                router.push(`/search?${params.toString()}`);
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
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-200 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Calendar portal — fixed position to prevent scroll-with-page */}
      {showCalendar && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/10 z-[998] animate-fade-in"
            onClick={() => setShowCalendar(false)}
          />
          <div
            ref={calendarPopupRef}
            className="fixed z-[999] bg-white shadow-2xl border border-gray-100
              bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up
              sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:animate-fade-in-up sm:w-[340px] md:w-[620px]
              max-h-[80vh] overflow-y-auto"
          >
            {/* Mobile drag handle */}
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
              <MiniCalendar
                checkIn={filters.checkIn}
                checkOut={filters.checkOut}
                onSelectDate={handleDateSelect}
                locale={isAr ? 'ar' : 'en'}
                dual
              />
            </div>
            <div className="md:hidden">
              <MiniCalendar
                checkIn={filters.checkIn}
                checkOut={filters.checkOut}
                onSelectDate={handleDateSelect}
                locale={isAr ? 'ar' : 'en'}
              />
            </div>
            {/* Clear dates */}
            {filters.checkIn && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, checkIn: '', checkOut: '' }));
                    setSelectingCheckOut(false);
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  {isAr ? 'مسح التواريخ' : 'Clear dates'}
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
