'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Property } from '@/types';
import { propertiesApi, bookingsApi } from '@/lib/api';
import { formatPrice, formatDate, calculateNights, getDiscountedPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Users, CreditCard, Shield, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Link from 'next/link';

function BookingContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [step, setStep] = useState(1);

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guestsCount = parseInt(searchParams.get('guests') || '1', 10);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/booking/${id}?${searchParams.toString()}`);
      return;
    }
    fetchProperty();
  }, [id, isAuthenticated]);

  const fetchProperty = async () => {
    try {
      const res = await propertiesApi.getOne(id);
      setProperty(res.data.data);
    } catch {
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !property) {
    return (
      <>
        <Header />
        <main className="container-custom py-12">
          <div className="max-w-2xl mx-auto animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded-2xl" />
            <div className="h-60 bg-gray-100 rounded-2xl" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const pricePerNight = property.pricing.discountPercent > 0
    ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
    : property.pricing.perNight;
  const subtotal = nights * pricePerNight;
  const cleaningFee = property.pricing.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + cleaningFee + serviceFee;

  const primaryImage = property.images.find((i) => i.isPrimary)?.url || property.images[0]?.url;

  const handleConfirmBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.error('Missing dates');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await bookingsApi.create({
        propertyId: id,
        checkIn,
        checkOut,
        guests: { adults: guestsCount, children: 0, infants: 0 },
        specialRequests,
      });
      toast.success('Booking confirmed!');
      router.push(`/dashboard/bookings?booking=${res.data.data._id}&success=true`);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to confirm booking';
      toast.error(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container-custom py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Confirm your booking</h1>

            {/* Steps */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s}
                  </div>
                  <span className={`text-sm font-medium ${step >= s ? 'text-primary-600' : 'text-gray-400'}`}>
                    {s === 1 ? 'Review' : 'Confirm'}
                  </span>
                  {s < 2 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: Details */}
              <div className="lg:col-span-3 space-y-6">
                {/* Trip details */}
                <div className="bg-white rounded-2xl p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 text-lg mb-4">Trip details</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">Dates</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(checkIn)} â {formatDate(checkOut)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {nights} night{nights !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">Guests</p>
                          <p className="text-xs text-gray-500">
                            Up to {property.capacity.maxGuests} allowed
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {guestsCount} guest{guestsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 py-3">
                      <Shield className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Free cancellation</p>
                        <p className="text-xs text-gray-500">Cancel before check-in for a full refund</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special requests */}
                <div className="bg-white rounded-2xl p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 text-lg mb-3">Special requests (optional)</h2>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests or notes for the host?"
                    rows={3}
                    className="input-base resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1.5 text-right">{specialRequests.length}/500</p>
                </div>

                {/* Guest info */}
                <div className="bg-white rounded-2xl p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 text-lg mb-4">Guest information</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-lg">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/profile" className="text-xs text-primary-600 hover:underline mt-3 inline-block">
                    Edit profile
                  </Link>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-card sticky top-24">
                  {/* Property thumbnail */}
                  <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                    {primaryImage && (
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={primaryImage}
                          alt={property.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2">{property.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{property.location.city}</p>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-3 text-sm mb-6">
                    <h3 className="font-bold text-gray-900">Price details</h3>
                    <div className="flex justify-between text-gray-600">
                      <span>{formatPrice(pricePerNight)} Ã {nights} night{nights !== 1 ? 's' : ''}</span>
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
                    {property.pricing.discountPercent > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({property.pricing.discountPercent}%)</span>
                        <span>-{formatPrice(property.pricing.perNight * nights * (property.pricing.discountPercent / 100))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200 text-base">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Confirm button */}
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={bookingLoading}
                    size="lg"
                    className="w-full"
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  >
                    Confirm Booking
                  </Button>

                  <p className="text-xs text-center text-gray-500 mt-3">
                    By confirming, you agree to our{' '}
                    <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <BookingContent />
    </Suspense>
  );
}
