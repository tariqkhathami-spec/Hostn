'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';
import { formatPrice, calculateNights, getDiscountedPrice } from '@/lib/utils';
import { Calendar, Users, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import toast from 'react-hot-toast';

interface BookingWidgetProps {
  property: Property;
}

export default function BookingWidget({ property }: BookingWidgetProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const today = new Date().toISOString().split('T')[0];

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const pricePerNight = property.pricing.discountPercent > 0
    ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
    : property.pricing.perNight;

  const subtotal = nights * pricePerNight;
  const cleaningFee = property.pricing.cleaningFee || 0;
  const serviceFee = Math.round((subtotal + cleaningFee) * 0.1);
  const total = subtotal + cleaningFee + serviceFee;

  const handleBookNow = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (nights <= 0) {
      toast.error('Check-out must be after check-in');
      return;
    }
    if (guests > property.capacity.maxGuests) {
      toast.error(`Maximum ${property.capacity.maxGuests} guests allowed`);
      return;
    }

    const params = new URLSearchParams({ checkIn, checkOut, guests: guests.toString() });
    router.push(`/booking/${property._id}?${params.toString()}`);
  };

  return (
    <div className="card p-6 sticky top-24">
      {/* Price header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {property.pricing.discountPercent > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(pricePerNight)}
              </span>
              <span className="text-base text-gray-400 line-through">
                {formatPrice(property.pricing.perNight)}
              </span>
              <span className="text-sm text-gray-500">/night</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(pricePerNight)}
              </span>
              <span className="text-sm text-gray-500">/night</span>
            </div>
          )}
        </div>
        {property.ratings.count > 0 && (
          <StarRating
            rating={property.ratings.average}
            count={property.ratings.count}
            size="sm"
          />
        )}
      </div>

      {/* Date inputs */}
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-3 focus-within:border-primary-400 transition-colors">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <div className="p-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">CHECK-IN</label>
            <div className="relative">
              <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="pl-5 w-full text-sm font-medium text-gray-800 focus:outline-none"
              />
            </div>
          </div>
          <div className="p-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">CHECK-OUT</label>
            <div className="relative">
              <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="pl-5 w-full text-sm font-medium text-gray-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 p-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">GUESTS</label>
          <div className="relative">
            <Users className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="pl-5 w-full text-sm font-medium text-gray-800 focus:outline-none appearance-none"
            >
              {[...Array(property.capacity.maxGuests)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} guest{i > 0 ? 's' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      <Button onClick={handleBookNow} size="lg" className="w-full mb-4">
        {checkIn && checkOut ? `Book for ${nights} night${nights !== 1 ? 's' : ''}` : 'Check Availability'}
      </Button>

      <p className="text-xs text-center text-gray-500 mb-5">You won't be charged yet</p>

      {/* Price breakdown */}
      {nights > 0 && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{formatPrice(pricePerNight)} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Cleaning fee</span>
              <span>{formatPrice(cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Service fee</span>
            <span>{formatPrice(serviceFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
