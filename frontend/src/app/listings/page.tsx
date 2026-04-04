'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/listings/PropertyCard';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { CITIES } from '@/lib/constants';
import Link from 'next/link';
import {
  Search, MapPin, Calendar, Users, X, ChevronDown, Minus, Plus,
  Building, BedDouble, Star, Percent, DollarSign, Map, Droplets, Compass, Ruler,
} from 'lucide-react';
import { Property } from '@/types';
import MiniCalendar from '@/components/ui/MiniCalendar';
import { format, addDays } from 'date-fns';
import { calculateNights } from '@/lib/utils';
import { DISTRICTS, DIRECTIONS } from '@/lib/constants';

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}

// ─── Property types ───────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { key: 'chalet', icon: '\u{1F3D6}', label: { en: 'Chalets', ar: '\u0634\u0627\u0644\u064A\u0647\u0627\u062A' } },
  { key: 'villa', icon: '\u{1F3E0}', label: { en: 'Villas', ar: '\u0641\u0644\u0644' } },
  { key: 'apartment', icon: '\u{1F3E2}', label: { en: 'Apartments', ar: '\u0634\u0642\u0642' } },
  { key: 'farm', icon: '\u{1F333}', label: { en: 'Farms', ar: '\u0645\u0632\u0627\u0631\u0639' } },
  { key: 'camp', icon: '\u{26FA}', label: { en: 'Camps', ar: '\u0645\u062E\u064A\u0645\u0627\u062A' } },
  { key: 'hotel', icon: '\u{1F3E8}', label: { en: 'Hotels', ar: '\u0641\u0646\u0627\u062F\u0642' } },
  { key: 'studio', icon: '\u{1F3A8}', label: { en: 'Studios', ar: '\u0627\u0633\u062A\u0648\u062F\u064A\u0648' } },
];

const BEDROOM_OPTIONS = [
  { value: '', label: { en: 'Any', ar: '\u0627\u0644\u0643\u0644' } },
  { value: '1', label: { en: '1+', ar: '1+' } },
  { value: '2', label: { en: '2+', ar: '2+' } },
  { value: '3', label: { en: '3+', ar: '3+' } },
  { value: '4', label: { en: '4+', ar: '4+' } },
  { value: '5', label: { en: '5+', ar: '5+' } },
];

const RATING_OPTIONS = [
  { value: '', label: { en: 'Any', ar: '\u0627\u0644\u0643\u0644' } },
  { value: '6', label: { en: '6+', ar: '6+' } },
  { value: '7', label: { en: '7+', ar: '7+' } },
  { value: '8', label: { en: '8+', ar: '8+' } },
  { value: '9', label: { en: '9+', ar: '9+' } },
];

// ─── FilterBubble component ──────────────────────────────────────────────────
function FilterBubble({
  icon: Icon,
  label,
  active,
  onClick,
  onClear,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
        active
          ? 'bg-primary-50 border-primary-300 text-primary-700'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {active && onClear && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-0.5 hover:text-primary-900"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function ListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search state ──
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || '');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');

  // Calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  // Guest picker
  const initGuests = Number(searchParams.get('guests') || 0);
  const [adults, setAdults] = useState(initGuests > 0 ? Math.max(1, initGuests) : 1);
  const [children, setChildren] = useState(0);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  // ── Filter state ──
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const t = searchParams.get('type');
    return t ? t.split(',') : [];
  });
  // price and area use slider state below
  const [minBedrooms, setMinBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [hasDiscount, setHasDiscount] = useState(searchParams.get('discount') === '1');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [hasPool, setHasPool] = useState(searchParams.get('pool') === '1');
  const [direction, setDirection] = useState(searchParams.get('direction') || '');
  const [priceRange, setPriceRange] = useState(Number(searchParams.get('maxPrice')) || 4000);
  const [areaRange, setAreaRange] = useState(Number(searchParams.get('maxArea')) || 1500);

  // ── Filter popover state ──
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // ── Refs ──
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const guestPickerRef = useRef<HTMLDivElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);

  // Init city text from URL
  useEffect(() => {
    if (searchCity) {
      const found = CITIES.find((c) => c.value === searchCity);
      if (found) setCitySearch(isAr ? found.ar : found.en);
      else setCitySearch(searchCity);
    }
  }, []);

  const filteredCities = CITIES.filter((c) => {
    const q = citySearch.toLowerCase();
    return !q || c.en.toLowerCase().includes(q) || c.ar.includes(q);
  });

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) setShowCityDropdown(false);
      if (calendarWrapperRef.current && !calendarWrapperRef.current.contains(target)) setShowCalendar(false);
      if (guestPickerRef.current && !guestPickerRef.current.contains(target)) setShowGuestPicker(false);
      if (filterRowRef.current && !filterRowRef.current.contains(target)) setOpenFilter(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync guests total
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
        // Don't auto-close — wait for OK button
      } else {
        setCheckIn(dateStr);
        setCheckOut('');
      }
    }
  }, [selectingCheckOut, checkIn]);

  const handleCalendarConfirm = useCallback(() => {
    setShowCalendar(false);
    // Auto-flow: open guests after dates
    if (!guests) setShowGuestPicker(true);
  }, [guests]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const handleDurationShortcut = useCallback((nights: number) => {
    const startDate = checkIn || today;
    const endDate = format(addDays(new Date(startDate), nights), 'yyyy-MM-dd');
    setCheckIn(startDate);
    setCheckOut(endDate);
    setSelectingCheckOut(false);
  }, [checkIn, today]);

  const durationShortcuts = [
    { nights: 1, label: isAr ? 'ليلة' : '1 Night' },
    { nights: 2, label: isAr ? 'ليلتان' : '2 Nights' },
    { nights: 3, label: isAr ? '3 ليالي' : '3 Nights' },
    { nights: 7, label: isAr ? 'أسبوع' : '1 Week' },
  ];

  // Format date display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isAr
      ? date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
      : format(date, 'MMM d');
  };

  // ── Fetch ──
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchCity) params.city = searchCity;
      if (selectedTypes.length > 0) params.type = selectedTypes.join(',');
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      if (priceRange < 4000) params.maxPrice = priceRange;
      if (guests) params.guests = Number(guests);
      if (minBedrooms) params.bedrooms = Number(minBedrooms);
      if (minRating) params.rating = Number(minRating);
      if (hasDiscount) params.discount = 1;
      if (district) params.district = district;
      if (hasPool) params.pool = 1;
      if (direction) params.direction = direction;
      if (areaRange < 1500) params.maxArea = areaRange;
      const res = await propertiesApi.getAll(params);
      setProperties(res.data.properties || res.data.data || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (selectedTypes.length > 0) params.set('type', selectedTypes.join(','));
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (priceRange < 4000) params.set('maxPrice', String(priceRange));
    if (guests) params.set('guests', guests);
    if (minBedrooms) params.set('bedrooms', minBedrooms);
    if (minRating) params.set('rating', minRating);
    if (hasDiscount) params.set('discount', '1');
    if (district) params.set('district', district);
    if (hasPool) params.set('pool', '1');
    if (direction) params.set('direction', direction);
    if (areaRange < 1500) params.set('maxArea', String(areaRange));
    router.push(`/listings?${params.toString()}`);
    setOpenFilter(null);
    fetchProperties();
  };

  // Auto-fetch on first load and when filters change via bubbles
  useEffect(() => { fetchProperties(); }, []);

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const hasActiveFilters = !!(priceRange < 4000 || minBedrooms || minRating || hasDiscount || district || hasPool || direction || areaRange < 1500);
  const clearAllFilters = () => {
    setPriceRange(4000); setMinBedrooms(''); setMinRating('');
    setHasDiscount(false); setDistrict(''); setSelectedTypes([]);
    setHasPool(false); setDirection(''); setAreaRange(1500);
  };

  // Auto-flow: city → calendar
  const handleCitySelect = (value: string, label: string) => {
    setSearchCity(value);
    setCitySearch(label);
    setShowCityDropdown(false);
    if (!checkIn) {
      setTimeout(() => setShowCalendar(true), 150);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary-600 transition-colors">{isAr ? '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629' : 'Home'}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-700">{isAr ? '\u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A' : 'Properties'}</span>
            {searchCity && (
              <>
                <span className="mx-1.5">/</span>
                <span className="text-gray-700">
                  {isAr ? (CITIES.find(c => c.value === searchCity)?.ar || searchCity) : searchCity}
                </span>
              </>
            )}
          </nav>

          {/* ═══ Search Bar ═══ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* City */}
              <div className="relative" ref={cityDropdownRef}>
                <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => { setCitySearch(e.target.value); setSearchCity(''); setShowCityDropdown(true); }}
                  onFocus={() => setShowCityDropdown(true)}
                  placeholder={isAr ? '\u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u062F\u064A\u0646\u0629...' : 'Search city...'}
                  className="w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                />
                <ChevronDown className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                {showCityDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto">
                    <button type="button" onClick={() => handleCitySelect('', isAr ? '' : '')} className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${!searchCity ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-primary-50'}`}>
                      {isAr ? '\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062F\u0646' : 'All cities'}
                    </button>
                    {filteredCities.map((c) => (
                      <button key={c.value} type="button" onClick={() => handleCitySelect(c.value, isAr ? c.ar : c.en)}
                        className={`w-full text-start px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${searchCity === c.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-primary-50'}`}>
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {isAr ? c.ar : c.en}
                      </button>
                    ))}
                    {filteredCities.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">{isAr ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C' : 'No results'}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Dates — calendar with OK button */}
              <div className="relative lg:col-span-2" ref={calendarWrapperRef}>
                <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <button type="button"
                  onClick={() => { setShowCalendar(!showCalendar); if (!showCalendar && !checkIn) setSelectingCheckOut(false); }}
                  className={`w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2.5 border rounded-xl text-sm text-start transition-all bg-white ${showCalendar ? 'border-primary-400 ring-2 ring-primary-400/40' : 'border-gray-200'}`}>
                  <span className={checkIn ? 'text-gray-800' : 'text-gray-400'}>
                    {checkIn && checkOut ? `${formatDateDisplay(checkIn)} \u2014 ${formatDateDisplay(checkOut)}`
                      : checkIn ? `${formatDateDisplay(checkIn)} \u2014 ...`
                        : isAr ? '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0648\u0635\u0648\u0644 \u2014 \u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629' : 'Check-in \u2014 Check-out'}
                  </span>
                  {checkIn && checkOut && (
                    <span className="text-xs text-primary-500 font-medium ms-1">
                      {(() => { const n = calculateNights(checkIn, checkOut); return isAr ? `${n} ليلة` : `${n} night${n > 1 ? 's' : ''}`; })()}
                    </span>
                  )}
                </button>
                {showCalendar && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[300px] md:min-w-[580px]">
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-xs font-semibold text-primary-600">
                        {selectingCheckOut
                          ? (isAr ? '\u0627\u062E\u062A\u0631 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629' : 'Select check-out date')
                          : (isAr ? '\u0627\u062E\u062A\u0631 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0648\u0635\u0648\u0644' : 'Select check-in date')}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <MiniCalendar checkIn={checkIn} checkOut={checkOut} onSelectDate={handleDateSelect} onConfirm={handleCalendarConfirm} locale={isAr ? 'ar' : 'en'} dual />
                    </div>
                    <div className="md:hidden">
                      <MiniCalendar checkIn={checkIn} checkOut={checkOut} onSelectDate={handleDateSelect} onConfirm={handleCalendarConfirm} locale={isAr ? 'ar' : 'en'} />
                    </div>
                    <div className="px-3 pb-3 pt-1 border-t border-gray-50">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {isAr ? 'اختيار سريع' : 'Quick select'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {durationShortcuts.map((d) => (
                          <button key={d.nights} type="button" onClick={() => handleDurationShortcut(d.nights)}
                            className="bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-full px-3 py-1.5 text-xs font-medium transition-colors">
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guests */}
              <div className="relative" ref={guestPickerRef}>
                <Users className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 z-10" />
                <button type="button" onClick={() => setShowGuestPicker(!showGuestPicker)}
                  className={`w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-2.5 border rounded-xl text-sm text-start transition-all bg-white ${showGuestPicker ? 'border-primary-400 ring-2 ring-primary-400/40' : 'border-gray-200'}`}>
                  <span className={guests ? 'text-gray-800' : 'text-gray-400'}>
                    {guests
                      ? isAr ? `${adults} \u0628\u0627\u0644\u063A${children > 0 ? ` \u00B7 ${children} \u0637\u0641\u0644` : ''}` : `${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? ` \u00B7 ${children} Child${children > 1 ? 'ren' : ''}` : ''}`
                      : isAr ? '\u0639\u062F\u062F \u0627\u0644\u0636\u064A\u0648\u0641' : 'Guests'}
                  </span>
                </button>
                <ChevronDown className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform ${showGuestPicker ? 'rotate-180' : ''}`} />
                {showGuestPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[220px]">
                    {/* Adults */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{isAr ? '\u0628\u0627\u0644\u063A\u064A\u0646' : 'Adults'}</div>
                        <div className="text-xs text-gray-400">{isAr ? '13 \u0633\u0646\u0629 \u0641\u0623\u0643\u062B\u0631' : 'Ages 13+'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-6 text-center text-sm font-medium">{adults}</span>
                        <button type="button" onClick={() => setAdults((a) => Math.min(16, a + 1))} disabled={adults >= 16} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* Children */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{isAr ? '\u0623\u0637\u0641\u0627\u0644' : 'Children'}</div>
                        <div className="text-xs text-gray-400">{isAr ? '0\u201312 \u0633\u0646\u0629' : 'Ages 0\u201312'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-6 text-center text-sm font-medium">{children}</span>
                        <button type="button" onClick={() => setChildren((c) => Math.min(10, c + 1))} disabled={children >= 10} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* Confirm button */}
                    <div className="flex ltr:justify-end rtl:justify-start">
                      <button type="button" onClick={() => { setShowGuestPicker(false); }} className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
                        {isAr ? '\u062A\u0623\u0643\u064A\u062F' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search */}
              <button onClick={handleSearch} className="btn-primary flex items-center justify-center gap-2 rounded-xl">
                <Search className="w-4 h-4" />
                {isAr ? '\u0628\u062D\u062B' : 'Search'}
              </button>
            </div>
          </div>

          {/* ═══ Filter Bubbles ═══ */}
          <div className="flex flex-wrap items-center gap-2 mb-6" ref={filterRowRef}>
            {/* Type — multi-select */}
            <div className="relative">
              <FilterBubble
                icon={Building}
                label={selectedTypes.length > 0
                  ? (selectedTypes.length === 1
                    ? (PROPERTY_TYPES.find(t => t.key === selectedTypes[0])?.label[lang] || selectedTypes[0])
                    : `${selectedTypes.length} ${isAr ? '\u0623\u0646\u0648\u0627\u0639' : 'types'}`)
                  : (isAr ? '\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631' : 'Type')}
                active={selectedTypes.length > 0}
                onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
                onClear={selectedTypes.length > 0 ? () => { setSelectedTypes([]); } : undefined}
              />
              {openFilter === 'type' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[220px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROPERTY_TYPES.map(({ key, icon, label }) => (
                      <button key={key} type="button" onClick={() => toggleType(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedTypes.includes(key)
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-gray-600 hover:bg-gray-50 border border-gray-100'
                        }`}>
                        <span>{icon}</span>
                        {label[lang]}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setOpenFilter(null); handleSearch(); }}
                    className="w-full mt-2 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
                    {isAr ? '\u062A\u0637\u0628\u064A\u0642' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Bedrooms */}
            <div className="relative">
              <FilterBubble
                icon={BedDouble}
                label={minBedrooms ? `${minBedrooms}+ ${isAr ? '\u063A\u0631\u0641' : 'bed'}` : (isAr ? '\u063A\u0631\u0641 \u0627\u0644\u0646\u0648\u0645' : 'Bedrooms')}
                active={!!minBedrooms}
                onClick={() => setOpenFilter(openFilter === 'bedrooms' ? null : 'bedrooms')}
                onClear={minBedrooms ? () => setMinBedrooms('') : undefined}
              />
              {openFilter === 'bedrooms' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[180px]">
                  <div className="flex flex-wrap gap-1.5">
                    {BEDROOM_OPTIONS.map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => { setMinBedrooms(value); setOpenFilter(null); handleSearch(); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          minBedrooms === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="relative">
              <FilterBubble
                icon={Star}
                label={minRating ? `${minRating}+` : (isAr ? '\u0627\u0644\u062A\u0642\u064A\u064A\u0645' : 'Rating')}
                active={!!minRating}
                onClick={() => setOpenFilter(openFilter === 'rating' ? null : 'rating')}
                onClear={minRating ? () => setMinRating('') : undefined}
              />
              {openFilter === 'rating' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[160px]">
                  <div className="flex flex-wrap gap-1.5">
                    {RATING_OPTIONS.map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => { setMinRating(value); setOpenFilter(null); handleSearch(); }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          minRating === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {value && <Star className="w-3 h-3" />}
                        {label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pool */}
            <FilterBubble
              icon={Droplets}
              label={isAr ? '\u0645\u0633\u0628\u062D' : 'Pool'}
              active={hasPool}
              onClick={() => { setHasPool(!hasPool); setTimeout(handleSearch, 0); }}
              onClear={hasPool ? () => { setHasPool(false); } : undefined}
            />

            {/* Discount */}
            <FilterBubble
              icon={Percent}
              label={isAr ? '\u0639\u0631\u0648\u0636' : 'Offers'}
              active={hasDiscount}
              onClick={() => { setHasDiscount(!hasDiscount); setTimeout(handleSearch, 0); }}
              onClear={hasDiscount ? () => { setHasDiscount(false); } : undefined}
            />

            {/* Price Slider */}
            <div className="relative">
              <FilterBubble
                icon={DollarSign}
                label={priceRange < 4000
                  ? `${isAr ? '\u062D\u062A\u0649' : 'Up to'} ${priceRange} SAR`
                  : (isAr ? '\u0627\u0644\u0633\u0639\u0631' : 'Price')}
                active={priceRange < 4000}
                onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
                onClear={priceRange < 4000 ? () => setPriceRange(4000) : undefined}
              />
              {openFilter === 'price' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[260px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-gray-500">0 SAR</span>
                    <span className="text-xs font-bold text-primary-700">{priceRange >= 4000 ? '4000+' : priceRange} SAR</span>
                    <span className="text-[10px] font-medium text-gray-500">4000+</span>
                  </div>
                  <input type="range" min="0" max="4000" step="100" value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="w-full accent-primary-600 h-1.5 cursor-pointer" />
                  <button type="button" onClick={() => { setOpenFilter(null); handleSearch(); }}
                    className="w-full mt-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
                    {isAr ? '\u062A\u0637\u0628\u064A\u0642' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Area Slider (m²) */}
            <div className="relative">
              <FilterBubble
                icon={Ruler}
                label={areaRange < 1500
                  ? `${isAr ? '\u062D\u062A\u0649' : 'Up to'} ${areaRange} m\u00B2`
                  : (isAr ? '\u0627\u0644\u0645\u0633\u0627\u062D\u0629' : 'Area')}
                active={areaRange < 1500}
                onClick={() => setOpenFilter(openFilter === 'area' ? null : 'area')}
                onClear={areaRange < 1500 ? () => setAreaRange(1500) : undefined}
              />
              {openFilter === 'area' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[260px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-gray-500">0 m\u00B2</span>
                    <span className="text-xs font-bold text-primary-700">{areaRange >= 1500 ? '1500+' : areaRange} m\u00B2</span>
                    <span className="text-[10px] font-medium text-gray-500">1500+ m\u00B2</span>
                  </div>
                  <input type="range" min="0" max="1500" step="50" value={areaRange}
                    onChange={(e) => setAreaRange(Number(e.target.value))}
                    className="w-full accent-primary-600 h-1.5 cursor-pointer" />
                  <button type="button" onClick={() => { setOpenFilter(null); handleSearch(); }}
                    className="w-full mt-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
                    {isAr ? '\u062A\u0637\u0628\u064A\u0642' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Direction */}
            <div className="relative">
              <FilterBubble
                icon={Compass}
                label={direction
                  ? (DIRECTIONS.find(d => d.value === direction)?.[lang] || direction)
                  : (isAr ? '\u0627\u0644\u0627\u062A\u062C\u0627\u0647' : 'Direction')}
                active={!!direction}
                onClick={() => setOpenFilter(openFilter === 'direction' ? null : 'direction')}
                onClear={direction ? () => setDirection('') : undefined}
              />
              {openFilter === 'direction' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[200px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    {DIRECTIONS.map((d) => (
                      <button key={d.value} type="button"
                        onClick={() => { setDirection(d.value); setOpenFilter(null); handleSearch(); }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          direction === d.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {d[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* District (city-dependent) */}
            <div className="relative">
              <FilterBubble
                icon={Map}
                label={district
                  ? (DISTRICTS[searchCity]?.find(d => d.value === district)?.[lang] || district)
                  : (isAr ? '\u0627\u0644\u062D\u064A' : 'District')}
                active={!!district}
                onClick={() => setOpenFilter(openFilter === 'district' ? null : 'district')}
                onClear={district ? () => setDistrict('') : undefined}
              />
              {openFilter === 'district' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[220px] max-h-[280px] overflow-y-auto">
                  {searchCity && DISTRICTS[searchCity] ? (
                    <div className="space-y-1">
                      {DISTRICTS[searchCity].map((d) => (
                        <button key={d.value} type="button"
                          onClick={() => { setDistrict(d.value); setOpenFilter(null); handleSearch(); }}
                          className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            district === d.value ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                          {d[lang]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-3">
                      {isAr ? '\u0627\u062E\u062A\u0631 \u0645\u062F\u064A\u0646\u0629 \u0623\u0648\u0644\u0627\u064B' : 'Select a city first'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Clear all */}
            {(hasActiveFilters || selectedTypes.length > 0) && (
              <button type="button" onClick={() => { clearAllFilters(); setTimeout(handleSearch, 0); }}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                <X className="w-3 h-3" />
                {isAr ? '\u0645\u0633\u062D \u0627\u0644\u0643\u0644' : 'Clear all'}
              </button>
            )}
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-sm text-gray-500 mb-4">
              {isAr
                ? `${properties.length} \u0639\u0642\u0627\u0631`
                : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`}
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
              <p className="text-gray-500 text-lg">{isAr ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0642\u0627\u0631\u0627\u062A' : 'No properties found'}</p>
              <p className="text-sm text-gray-400 mt-2">{isAr ? '\u062D\u0627\u0648\u0644 \u062A\u0639\u062F\u064A\u0644 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0628\u062D\u062B' : 'Try adjusting your search criteria'}</p>
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
