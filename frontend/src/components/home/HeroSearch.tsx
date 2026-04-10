'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, ChevronDown, Star, Shield, Award } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES } from '@/lib/constants';
import MiniCalendar from '@/components/ui/MiniCalendar';
import { calculateNights, getNightLabel } from '@/lib/utils';
import { saveSearchCookies, getSearchCookies } from '@/lib/searchCookies';

type SearchStep = 'idle' | 'location' | 'type' | 'dates' | 'ready';

export default function HeroSearch() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  // Restore previous search from cookies
  const savedSearch = getSearchCookies();

  // Search state
  const [city, setCity] = useState(savedSearch?.city || '');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [propertyType, setPropertyType] = useState(savedSearch?.type || '');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [checkIn, setCheckIn] = useState(savedSearch?.checkIn || '');
  const [checkOut, setCheckOut] = useState(savedSearch?.checkOut || '');

  // Step flow state
  const [step, setStep] = useState<SearchStep>('idle');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  // Keyboard nav for city dropdown
  const [cityHighlight, setCityHighlight] = useState(-1);

  // Refs for click-outside
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarPopupRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCities = CITIES.filter((c) => {
    const q = citySearch.toLowerCase();
    return !q || c.en.toLowerCase().includes(q) || c.ar.includes(q);
  });

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
    setShowCalendar(false);
    saveSearchCookies({ city, type: propertyType, checkIn, checkOut });
    router.push('/search');
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  // City selection handler — updates city, auto-opens property type dropdown
  const handleCitySelect = useCallback((cityValue: string, cityLabel: string) => {
    setCity(cityValue);
    setCitySearch(cityLabel);
    setShowCityDropdown(false);
    saveSearchCookies({ city: cityValue });
    setShowTypeDropdown(true);
    setStep('type');
  }, []);

  // Calendar date selection handler — calendar stays open, only closes via outside click or search
  const handleDateSelect = useCallback((dateStr: string) => {
    if (!selectingCheckOut) {
      setCheckIn(dateStr);
      setCheckOut('');
      setSelectingCheckOut(true);
    } else {
      if (dateStr > checkIn) {
        setCheckOut(dateStr);
        setSelectingCheckOut(false);
        setStep('ready');
      } else {
        setCheckIn(dateStr);
        setCheckOut('');
      }
    }
  }, [selectingCheckOut, checkIn]);

  // Duration shortcut handler — calendar stays open
  const handleDurationShortcut = useCallback((nights: number) => {
    const startDate = checkIn || today;
    const endDate = format(addDays(new Date(startDate), nights), 'yyyy-MM-dd');
    setCheckIn(startDate);
    setCheckOut(endDate);
    setSelectingCheckOut(false);
    setStep('ready');
  }, [checkIn, today]);

  // Restore city label when dropdown closes without selection
  useEffect(() => {
    if (!showCityDropdown && city) {
      const found = CITIES.find((c) => c.value === city);
      if (found) setCitySearch(isAr ? found.ar : found.en);
    }
  }, [showCityDropdown, city, isAr]);

  // Update city label on language switch
  useEffect(() => {
    if (city) {
      const found = CITIES.find((c) => c.value === city);
      if (found) setCitySearch(isAr ? found.ar : found.en);
    }
  }, [isAr]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        calendarRef.current && !calendarRef.current.contains(target) &&
        calendarPopupRef.current && !calendarPopupRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setShowCityDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isAr
      ? date.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })
      : format(date, 'MMM d');
  };

  const durationShortcuts = [
    { nights: 1, label: t('hero.nights1') },
    { nights: 2, label: t('hero.nights2') },
    { nights: 3, label: t('hero.nights3') },
    { nights: 7, label: t('hero.week1') },
  ];

  // Step indicator dots
  const steps: { key: SearchStep; label: string }[] = [
    { key: 'location', label: t('hero.destination') },
    { key: 'type', label: t('hero.propertyType') },
    { key: 'dates', label: t('hero.dates') },
    { key: 'ready', label: t('hero.search') },
  ];

  const currentStepIndex = step === 'idle' ? -1 : steps.findIndex((s) => s.key === step);

  return (
    <div className="relative z-20 min-h-[520px] sm:min-h-[600px] md:min-h-[720px] flex items-center justify-center">
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(26,14,46,0.95) 0%, rgba(59,21,120,0.88) 35%, rgba(109,40,217,0.72) 70%, rgba(109,40,217,0.55) 100%)',
          }}
        />
      </div>

      {/* Decorative orbs */}
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
          <h1 className={`text-3xl sm:text-5xl md:text-7xl font-extrabold text-white mb-3 sm:mb-5 tracking-tight ${isAr ? 'leading-[1.3]' : 'leading-[1.1]'}`}>
            {t('hero.title1')}
            <br />
            <span className={`${isAr ? 'font-display-ar' : 'font-display italic'} text-gradient-gold inline-block mt-1`}>
              {t('hero.title2')}
            </span>
          </h1>
          <p className={`text-sm sm:text-base md:text-lg text-white/70 mb-6 sm:mb-10 mx-auto px-2 sm:px-0 ${isAr ? 'leading-[2.2] max-w-2xl font-normal' : 'leading-relaxed max-w-xl font-light'}`}>
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="animate-fade-in-up flex items-center justify-center gap-2 mb-4" style={{ animationDelay: '0.3s' }} aria-live="polite" role="status">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${i <= currentStepIndex ? 'bg-gold-400 scale-110' : 'bg-white/30'}
              `} />
              <span className={`text-xs font-medium transition-colors duration-300 ${i <= currentStepIndex ? 'text-gold-400' : 'text-white/40'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px transition-colors duration-300 ${i < currentStepIndex ? 'bg-gold-400/60' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Glass search box */}
        <div
          className="animate-fade-in-up max-w-5xl mx-auto relative z-50"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 md:p-5 border border-white/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {/* City */}
              <div className="relative" ref={cityDropdownRef}>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.destination')}
                </label>
                <div className="relative">
                  <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setCity('');
                      setShowCityDropdown(true);
                      setCityHighlight(-1);
                    }}
                    onFocus={() => {
                      setCitySearch('');
                      setShowCityDropdown(true);
                      setStep('location');
                    }}
                    onKeyDown={(e) => {
                      if (!showCityDropdown) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCityHighlight((h) => Math.min(h + 1, filteredCities.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCityHighlight((h) => Math.max(h - 1, 0));
                      } else if (e.key === 'Enter' && cityHighlight >= 0) {
                        e.preventDefault();
                        const c = filteredCities[cityHighlight];
                        handleCitySelect(c.value, isAr ? c.ar : c.en);
                        setCityHighlight(-1);
                      } else if (e.key === 'Escape') {
                        setShowCityDropdown(false);
                        setCityHighlight(-1);
                      }
                    }}
                    placeholder={t('hero.selectCity')}
                    aria-expanded={showCityDropdown}
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-activedescendant={cityHighlight >= 0 ? `city-option-${cityHighlight}` : undefined}
                    className={`w-full ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8 py-3 border rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-gray-50/50 transition-all duration-200 ${
                      step === 'location' ? 'border-primary-300 ring-2 ring-primary-400/40' : 'border-gray-100'
                    }`}
                  />
                  {showCityDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto animate-fade-in-up" role="listbox">
                      {/* Header */}
                      <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                        {t('hero.popularDestinations')}
                      </div>
                      <button
                        type="button"
                        role="option"
                        aria-selected={!city}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { handleCitySelect('', ''); setCityHighlight(-1); }}
                        className={`w-full text-start px-4 py-2.5 text-sm transition-colors min-h-[44px] ${!city ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'}`}
                      >
                        {isAr ? 'جميع المدن' : 'All cities'}
                      </button>
                      {filteredCities.map((c, idx) => (
                        <button
                          key={c.value}
                          id={`city-option-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={city === c.value}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { handleCitySelect(c.value, isAr ? c.ar : c.en); setCityHighlight(-1); }}
                          onMouseEnter={() => setCityHighlight(idx)}
                          className={`w-full text-start px-4 py-2.5 text-sm flex items-center gap-3 transition-colors min-h-[44px] ${
                            idx === cityHighlight
                              ? 'bg-primary-50 text-primary-700'
                              : city === c.value
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{isAr ? c.ar : c.en}</span>
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
              </div>

              {/* Type */}
              <div className="relative" ref={typeDropdownRef}>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.propertyType')}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowTypeDropdown(!showTypeDropdown); if (!showTypeDropdown) setStep('type'); }}
                    className={`w-full px-4 py-3 border rounded-xl text-sm text-start bg-gray-50/50 cursor-pointer transition-all duration-200 ${
                      showTypeDropdown || step === 'type' ? 'border-primary-300 ring-2 ring-primary-400/40' : 'border-gray-100'
                    } ${propertyType ? 'text-gray-800' : 'text-gray-800'}`}
                  >
                    {PROPERTY_TYPES.find(t => t.value === propertyType)?.label || PROPERTY_TYPES[0].label}
                  </button>
                  <ChevronDown className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                  {showTypeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto animate-fade-in-up">
                      {PROPERTY_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => { setPropertyType(type.value); setShowTypeDropdown(false); setShowCalendar(true); setStep('dates'); if (!checkIn) setSelectingCheckOut(false); }}
                          className={`w-full text-start px-4 py-2.5 text-sm transition-colors min-h-[44px] ${
                            propertyType === type.value
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates — visual calendar trigger */}
              <div className="relative" ref={calendarRef}>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1">
                  {t('hero.dates')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendar(!showCalendar);
                    if (!showCalendar) {
                      setStep('dates');
                      if (!checkIn) setSelectingCheckOut(false);
                    }
                  }}
                  className={`w-full flex items-center gap-2 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-3 border rounded-xl text-sm text-start transition-all duration-200 bg-gray-50/50 ${
                    step === 'dates' || showCalendar
                      ? 'border-primary-300 ring-2 ring-primary-400/40'
                      : 'border-gray-100'
                  }`}
                >
                  <Calendar className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <span className={checkIn ? 'text-gray-800' : 'text-gray-400'}>
                    {checkIn && checkOut
                      ? `${formatDateDisplay(checkIn)} — ${formatDateDisplay(checkOut)}`
                      : checkIn
                        ? `${formatDateDisplay(checkIn)} — ...`
                        : t('hero.checkIn') + ' — ' + t('hero.checkOut')
                    }
                  </span>
                  {checkIn && checkOut && (
                    <span className="text-xs text-primary-500 font-medium ms-1">
                      {(() => { const n = calculateNights(checkIn, checkOut); return getNightLabel(n, isAr ? 'ar' : 'en'); })()}
                    </span>
                  )}
                </button>
              </div>

              {/* Search button */}
              <div className="flex flex-col justify-end">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ltr:text-left rtl:text-right px-1 md:opacity-0">
                  {t('hero.search')}
                </label>
                <button
                  onClick={handleSearch}
                  className={`w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5 ${
                    step === 'ready' ? 'ring-2 ring-gold-400/50 animate-pulse-soft' : ''
                  }`}
                >
                  <Search className="w-4 h-4" />
                  {t('hero.search')}
                </button>
              </div>
            </div>
          </div>

          {/* Calendar dropdown — inside search container so it scrolls with page */}
          {showCalendar && (
            <div
              ref={calendarPopupRef}
              className="absolute ltr:right-0 rtl:left-0 top-full mt-2 z-[60] bg-white shadow-2xl border border-gray-100 rounded-2xl max-h-[80vh] overflow-y-auto animate-fade-in-up w-full max-w-[620px]"
            >
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold text-primary-600" aria-live="polite">
                  {selectingCheckOut ? t('hero.selectCheckOut') : t('hero.selectCheckIn')}
                </p>
              </div>

              <div className="hidden md:block">
                <MiniCalendar
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onSelectDate={handleDateSelect}
                  onConfirm={() => setShowCalendar(false)}
                  locale={isAr ? 'ar' : 'en'}
                  dual
                />
              </div>
              <div className="md:hidden">
                <MiniCalendar
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onSelectDate={handleDateSelect}
                  onConfirm={() => setShowCalendar(false)}
                  locale={isAr ? 'ar' : 'en'}
                />
              </div>

              <div className="px-3 pb-4 sm:pb-3 pt-1 border-t border-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t('hero.quickSelect')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {durationShortcuts.map((d) => (
                    <button
                      key={d.nights}
                      type="button"
                      onClick={() => handleDurationShortcut(d.nights)}
                      aria-label={`${d.label} ${isAr ? 'بدءاً من اليوم' : 'starting today'}`}
                      className="bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200 rounded-full px-3 py-1.5 sm:py-1 text-xs font-medium transition-colors min-h-[36px] sm:min-h-0"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick city links */}
        <div
          className="relative z-0 flex flex-wrap justify-center gap-2 mt-8 animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          {CITIES.slice(0, 6).map((c) => (
            <button
              key={c.value}
              onClick={() => {
                if (checkIn && checkOut) {
                  saveSearchCookies({ city: c.value });
                } else {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                  saveSearchCookies({ city: c.value, checkIn: todayStr, checkOut: tomorrowStr });
                }
                router.push('/search');
              }}
              className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-sm transition-all duration-300 border border-white/5 hover:border-white/15"
            >
              {isAr ? c.ar : c.en}
            </button>
          ))}
        </div>

        {/* Trust indicators */}
        <div
          className="relative z-0 flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10 mt-6 sm:mt-10 animate-fade-in-up"
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
