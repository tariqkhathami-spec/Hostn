'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const CITIES = [
  'Riyadh', 'Jeddah', 'Abha', 'Khobar', 'Taif', 'Al Ula', 'Hail', 'Mecca',
];

const PROPERTY_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Chalets', value: 'chalet' },
  { label: 'Apartments', value: 'apartment' },
  { label: 'Villas', value: 'villa' },
  { label: 'Studios', value: 'studio' },
  { label: 'Farms', value: 'farm' },
  { label: 'Camps', value: 'camp' },
];

export default function HeroSearch() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

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
    <div className="relative min-h-[520px] md:min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600)',
          }}
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom text-center py-16">
        <div className="animate-fade-in-up">
          <span className="inline-block bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm">
            🏡 Over 1,000+ unique properties
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
            Find Your Perfect
            <br />
            <span className="text-amber-300">Getaway</span>
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Discover chalets, villas, apartments, and unique stays for every occasion.
          </p>
        </div>

        {/* Search box */}
        <div className="animate-fade-in-up bg-white rounded-2xl shadow-2xl p-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* City */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 text-left px-1">
                City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white appearance-none cursor-pointer"
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Type */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 text-left px-1">
                Property Type
              </label>
              <div className="relative">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white appearance-none cursor-pointer"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Check-in */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 text-left px-1">
                Check-in
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            {/* Check-out */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 text-left px-1">
                Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || tomorrow}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            {/* Search button */}
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-semibold text-gray-500 mb-1 text-left px-1 md:opacity-0">
                Search
              </label>
              <button
                onClick={handleSearch}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 animate-fade-in-up">
          {CITIES.slice(0, 6).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCity(c);
                router.push(`/listings?city=${c}`);
              }}
              className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-1.5 rounded-full backdrop-blur-sm transition-all"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
