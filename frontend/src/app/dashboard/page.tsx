'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { bookingsApi } from '@/lib/api';
import { Booking } from '@/types';
import {
  BookOpen, CalendarDays, Heart, ArrowRight, Crown, Loader2, Wallet, ShieldBan, Star,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

export default function GuestDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, upgradeToHost } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'لوحة التحكم' : 'Dashboard');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBookings = async () => {
      try {
        const res = await bookingsApi.getMyBookings();
        setBookings(res.data.data || res.data || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [isAuthenticated]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeToHost();
      router.push('/host');
    } catch {
      setUpgrading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  ).length;
  const wishlistCount = user.wishlist?.length || 0;
  const recentBookings = bookings.slice(0, 5);

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

  const walletBalance = user.balance ?? 0;
  const hostsBlocked = user.blockedByHosts ?? 0;
  const guestRating = user.guestRating ?? 0;

  const stats = [
    {
      label: { en: 'Reservations', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
      value: totalBookings,
      icon: BookOpen,
      color: 'text-primary-600 bg-primary-50',
      href: '/dashboard/bookings',
    },
    {
      label: { en: 'Balance', ar: '\u0627\u0644\u0631\u0635\u064a\u062f' },
      value: <span dir="ltr"><SarSymbol /> {walletBalance}</span>,
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-50',
      href: '/dashboard/balance',
    },
    {
      label: { en: 'Host Blocks', ar: '\u062d\u0638\u0631 \u0627\u0644\u0645\u0636\u064a\u0641\u064a\u0646' },
      value: hostsBlocked,
      icon: ShieldBan,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: { en: 'My Rating', ar: '\u062a\u0642\u064a\u064a\u0645\u064a' },
      value: guestRating > 0 ? `${guestRating.toFixed(1)}/5` : (lang === 'ar' ? '\u0644\u0627 \u064a\u0648\u062c\u062f' : 'N/A'),
      icon: Star,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? `\u0645\u0631\u062d\u0628\u0627\u064b, ${user.name}` : `Welcome, ${user.name}`}
        </h1>
        <p className="text-gray-500 mt-1">
          {lang === 'ar'
            ? '\u0625\u0644\u064a\u0643 \u0645\u0644\u062e\u0635 \u062d\u0633\u0627\u0628\u0643'
            : "Here's an overview of your account"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label[lang]}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </>
          );
          const cardClass = `bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 ${stat.href ? 'hover:border-primary-300 transition-colors' : ''}`;
          return stat.href ? (
            <Link key={stat.label.en} href={stat.href} className={cardClass}>
              {content}
            </Link>
          ) : (
            <div key={stat.label.en} className={cardClass}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Become a Host CTA */}
      {user.role === 'guest' && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-gold-400" />
            <div>
              <h3 className="text-lg font-semibold">
                {lang === 'ar' ? '\u0643\u0646 \u0645\u0636\u064a\u0641\u0627\u064b' : 'Become a Host'}
              </h3>
              <p className="text-primary-100 text-sm">
                {lang === 'ar'
                  ? '\u0627\u0628\u062f\u0623 \u0628\u0643\u0633\u0628 \u0627\u0644\u0645\u0627\u0644 \u0645\u0646 \u0639\u0642\u0627\u0631\u0643'
                  : 'Start earning from your property'}
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-white text-primary-700 px-5 py-2.5 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
            {lang === 'ar' ? '\u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u0622\u0646' : 'Upgrade Now'}
          </button>
        </div>
      )}

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {lang === 'ar' ? '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0623\u062e\u064a\u0631\u0629' : 'Recent Bookings'}
          </h2>
          <Link
            href="/dashboard/bookings"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {lang === 'ar' ? '\u0639\u0631\u0636 \u0627\u0644\u0643\u0644' : 'View All'}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {lang === 'ar'
                ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0628\u0639\u062f'
                : 'No bookings yet'}
            </p>
            <Link
              href="/search"
              className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700"
            >
              {lang === 'ar' ? '\u062a\u0635\u0641\u062d \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Browse Properties'}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recentBookings.map((booking) => {
              const property = typeof booking.property === 'object' ? booking.property : null;
              return (
                <Link
                  key={booking._id}
                  href={`/dashboard/bookings/${booking._id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {property?.title || (lang === 'ar' ? '\u062d\u062c\u0632' : 'Booking')}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(booking.checkIn).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(booking.checkOut).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ms-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        statusColors[booking.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statusLabels[booking.status]?.[lang] || booking.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
