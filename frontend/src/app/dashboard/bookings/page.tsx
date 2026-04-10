'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { bookingsApi } from '@/lib/api';
import { useSocketEvent } from '@/lib/useSocket';
import { Booking, BookingUnit } from '@/types';
import { BookOpen, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

export default function MyBookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'حجوزاتي' : 'My Bookings');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await bookingsApi.getMyBookings();
      setBookings(res.data.data || res.data || []);
    } catch {
      setError(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, lang]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time: auto-refresh when booking status changes
  useSocketEvent('booking:updated', () => fetchBookings());
  useSocketEvent('booking:cancelled', () => fetchBookings());

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, { en: string; ar: string }> = {
    pending: { en: 'Pending', ar: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' },
    confirmed: { en: 'Confirmed', ar: '\u0645\u0624\u0643\u062f' },
    cancelled: { en: 'Cancelled', ar: '\u0645\u0644\u063a\u0649' },
    completed: { en: 'Completed', ar: '\u0645\u0643\u062a\u0645\u0644' },
    rejected: { en: 'Rejected', ar: '\u0645\u0631\u0641\u0648\u0636' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? '\u062d\u062c\u0648\u0632\u0627\u062a\u064a' : 'My Bookings'}
        </h1>
        <p className="text-gray-500 mt-1">
          {lang === 'ar'
            ? '\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u062c\u0645\u064a\u0639 \u062d\u062c\u0648\u0632\u0627\u062a\u0643'
            : 'View and manage all your bookings'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!error && bookings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a' : 'No Bookings Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {lang === 'ar'
              ? '\u0627\u0628\u062f\u0623 \u0628\u062a\u0635\u0641\u062d \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0648\u0627\u062d\u062c\u0632 \u0625\u0642\u0627\u0645\u062a\u0643 \u0627\u0644\u0623\u0648\u0644\u0649'
              : 'Start browsing properties and book your first stay'}
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {lang === 'ar' ? '\u062a\u0635\u0641\u062d \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Browse Properties'}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {bookings.map((booking) => {
            const property = typeof booking.property === 'object' ? booking.property : null;
            const unit = booking.unit && typeof booking.unit === 'object' ? (booking.unit as BookingUnit) : null;
            const total = booking.pricing?.total || 0;

            return (
              <Link
                key={booking._id}
                href={`/dashboard/bookings/${booking._id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 transition-colors gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {property?.title || (lang === 'ar' ? '\u062d\u062c\u0632' : 'Booking')}
                  </p>
                  {unit && (
                    <p className="text-xs text-primary-600 font-medium truncate mt-0.5">
                      {lang === 'ar' ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(booking.checkIn).toLocaleDateString(
                      lang === 'ar' ? 'ar-u-nu-latn' : 'en-US',
                      { month: 'short', day: 'numeric' }
                    )}{' '}
                    -{' '}
                    {new Date(booking.checkOut).toLocaleDateString(
                      lang === 'ar' ? 'ar-u-nu-latn' : 'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-900">
                    <span dir="ltr"><SarSymbol /> {total.toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-SA')}</span>
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                      statusColors[booking.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusLabels[booking.status]?.[lang] || booking.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 rtl:rotate-180 hidden sm:block" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
