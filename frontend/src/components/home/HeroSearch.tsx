'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, ChevronDown, Star, Shield, Award } from 'lucide-react';
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
              'linear-gradient(160deg, rgba(26,14,46,0.95) 0%, rgba(59,25,67,0.8) 100%)',
          }}
        />
      </div>
      <{/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-8" direction="ltr">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb4n">
            Discover Your Next Dream Escape
          </h1>
          <p className="text-lg sm:text-xl text-gray-200">
            Explore unique vacation rentals in Saudi Arabia
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md rounded-2l p-6 sm:p-8 space-y-4">
          <div className="hiwgi">
