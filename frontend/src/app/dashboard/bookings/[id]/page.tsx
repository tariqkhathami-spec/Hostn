'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { bookingsApi } from '@/lib/api';
import { Booking, Property, User } from '@/types';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  CalendarDays,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BedDouble,
  FileText,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { CITIES, DISTRICTS } from '@/lib/constants';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { en: string; ar: string; color: string; icon: React.ReactNode }> = {
  pending: { en: 'Pending', ar: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-4 h-4" /> },
  confirmed: { en: 'Confirmed', ar: 'مؤكد', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { en: 'Cancelled', ar: 'ملغى', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-4 h-4" /> },
  completed: { en: 'Completed', ar: 'مكتمل', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle2 className="w-4 h-4" /> },
  rejected: { en: 'Rejected', ar: 'مرفوض', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-4 h-4" /> },
};

const paymentStatusConfig: Record<string, { en: string; ar: string; color: string }> = {
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع', color: 'bg-orange-100 text-orange-700' },
  paid: { en: 'Paid', ar: 'مدفوع', color: 'bg-green-100 text-green-700' },
  refunded: { en: 'Refunded', ar: 'مسترد', color: 'bg-gray-100 text-gray-700' },
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !bookingId) return;
    const load = async () => {
      try {
        const res = await bookingsApi.getOne(bookingId);
        setBooking(res.data.data || res.data);
      } catch {
        toast.error(isAr ? 'فشل تحميل تفاصيل الحجز' : 'Failed to load booking details');
        router.push('/dashboard/bookings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, bookingId, isAr, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!booking) return null;

  const property = typeof booking.property === 'object' ? (booking.property as Property) : null;
  const guest = typeof booking.guest === 'object' ? (booking.guest as User) : null;
  const status = statusConfig[booking.status] || statusConfig.pending;
  const paymentStatus = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.unpaid;
  const pricing = booking.pricing;
  const nights = pricing?.nights || Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const primaryImage = property?.images?.find(img => img.isPrimary)?.url || property?.images?.[0]?.url;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(c => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase());
    return found?.ar || city;
  };

  const translateDistrict = (district: string, city: string) => {
    if (!isAr) return district;
    const cityDistricts = DISTRICTS[city] || [];
    const found = cityDistricts.find(d => d.value.toLowerCase() === district.toLowerCase() || d.en.toLowerCase() === district.toLowerCase());
    return found?.ar || district;
  };

  const totalGuests = (booking.guests?.adults || 0) + (booking.guests?.children || 0);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {isAr ? 'العودة للحجوزات' : 'Back to bookings'}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAr ? 'تفاصيل الحجز' : 'Booking Details'}
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-mono">
              #{booking._id.slice(-8).toUpperCase()}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${status.color}`}>
            {status.icon}
            {isAr ? status.ar : status.en}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Card */}
          {property && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {primaryImage && (
                  <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0">
                    <Image
                      src={primaryImage}
                      alt={property.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="p-5 flex-1">
                  <Link href={`/listings/${property._id}`} className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                    {property.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {property.location?.district ? `${translateDistrict(property.location.district, property.location?.city || '')}, ` : ''}
                      {translateCity(property.location?.city || '')}
                    </span>
                  </div>
                  {property.capacity && (
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-4 h-4" />
                        {property.capacity.bedrooms} {property.capacity.bedrooms !== 1 ? (isAr ? 'غرف' : 'beds') : (isAr ? 'غرفة' : 'bed')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dates & Guests */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {isAr ? 'تفاصيل الإقامة' : 'Stay Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'تسجيل الدخول' : 'Check-in'}</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkIn)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'تسجيل الخروج' : 'Check-out'}</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkOut)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'الضيوف' : 'Guests'}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.guests?.adults || 0} {isAr ? 'بالغين' : 'adults'}
                    {(booking.guests?.children || 0) > 0 && `, ${booking.guests.children} ${isAr ? 'أطفال' : 'children'}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{nights}</span> {nights === 1 ? (isAr ? 'ليلة' : 'night') : (isAr ? 'ليالي' : 'nights')}
              </p>
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                {isAr ? 'طلبات خاصة' : 'Special Requests'}
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Sidebar — Pricing & Payment */}
        <div className="space-y-6">
          {/* Pricing Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              {isAr ? 'ملخص السعر' : 'Price Summary'}
            </h2>
            <div className="space-y-3 text-sm">
              {pricing?.perNight != null && (
                <div className="flex justify-between text-gray-600">
                  <span dir="ltr"><SarSymbol /> {pricing.perNight.toLocaleString('en')} x {nights} {isAr ? 'ليالي' : 'nights'}</span>
                  <span dir="ltr"><SarSymbol /> {pricing.subtotal?.toLocaleString('en')}</span>
                </div>
              )}
              {(pricing?.cleaningFee || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{isAr ? 'رسوم التنظيف' : 'Cleaning fee'}</span>
                  <span dir="ltr"><SarSymbol /> {pricing.cleaningFee.toLocaleString('en')}</span>
                </div>
              )}
              {(pricing?.serviceFee || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{isAr ? 'رسوم الخدمة' : 'Service fee'}</span>
                  <span dir="ltr"><SarSymbol /> {pricing.serviceFee.toLocaleString('en')}</span>
                </div>
              )}
              {(pricing?.discount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{isAr ? 'خصم' : 'Discount'}</span>
                  <span dir="ltr">- <SarSymbol /> {pricing.discount.toLocaleString('en')}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span dir="ltr"><SarSymbol /> {pricing?.total?.toLocaleString('en') || '0'}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {isAr ? 'حالة الدفع' : 'Payment Status'}
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${paymentStatus.color}`}>
              {isAr ? paymentStatus.ar : paymentStatus.en}
            </span>
          </div>

          {/* Booking Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {isAr ? 'معلومات الحجز' : 'Booking Info'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{isAr ? 'تاريخ الحجز' : 'Booked on'}</span>
                <span className="text-gray-900">
                  {new Date(booking.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {guest && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{isAr ? 'الضيف' : 'Guest'}</span>
                  <span className="text-gray-900">{guest.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{isAr ? 'رقم الحجز' : 'Booking ID'}</span>
                <span className="text-gray-900 font-mono text-xs">{booking._id.slice(-8).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Need Help */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
            <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              {isAr ? 'هل تحتاج مساعدة بخصوص هذا الحجز؟' : 'Need help with this booking?'}
            </p>
            <Link
              href="/dashboard/support"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {isAr ? 'تواصل مع الدعم' : 'Contact Support'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
