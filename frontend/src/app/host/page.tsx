'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { hostApi } from '@/lib/api';
import { HostDashboardStats, Booking, HostNotification } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import ActionBanner, { ActionItem } from '@/components/host/ActionBanner';
import {
  Building2,
  CalendarDays,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Bell,
  Users,
  Activity,
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import ErrorState from '@/components/ui/ErrorState';

export default function HostDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, bookingsRes, notifRes] = await Promise.allSettled([
        hostApi.getStats(),
        hostApi.getRecentBookings(5),
        hostApi.getNotifications(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (bookingsRes.status === 'fulfilled') setRecentBookings(bookingsRes.value.data.data || []);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.data || []);

      // If all three failed, show error state
      if (statsRes.status === 'rejected' && bookingsRes.status === 'rejected' && notifRes.status === 'rejected') {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
    confirmed: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
    cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
    rejected: { color: 'bg-gray-100 text-gray-700', icon: XCircle },
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Couldn't load dashboard"
        message="We had trouble fetching your dashboard data. Please try again."
        onRetry={loadData}
      />
    );
  }

  // Build action items from live data
  const actionItems: ActionItem[] = [];
  if (stats?.bookings.pending && stats.bookings.pending > 0) {
    actionItems.push({
      id: 'pending-bookings',
      type: 'pending_booking',
      title: 'Pending Bookings',
      description: `You have ${stats.bookings.pending} booking${stats.bookings.pending > 1 ? 's' : ''} waiting for your approval`,
      href: '/host/bookings?status=pending',
      count: stats.bookings.pending,
      urgent: stats.bookings.pending >= 3,
    });
  }
  const unreadNotifs = notifications.filter((n) => !n.read);
  if (unreadNotifs.length > 0) {
    const reviewNotifs = unreadNotifs.filter((n) => n.type === 'review_new');
    if (reviewNotifs.length > 0) {
      actionItems.push({
        id: 'new-reviews',
        type: 'review_new',
        title: 'New Reviews',
        description: `${reviewNotifs.length} new review${reviewNotifs.length > 1 ? 's' : ''} to respond to`,
        href: '/host/reviews',
        count: reviewNotifs.length,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what's happening with your properties today
          </p>
        </div>
        <Link
          href="/host/listings/new"
          className="hidden md:flex btn-primary text-sm py-2.5 px-4 items-center gap-2"
        >
          + Add Property
        </Link>
      </div>

      {/* Action Banners */}
      {actionItems.length > 0 && <ActionBanner items={actionItems} />}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Earnings',
              value: formatPrice(stats.earnings.total),
              sub: `${formatPrice(stats.earnings.monthly)} this month`,
              icon: DollarSign,
              color: 'bg-emerald-50 text-emerald-600',
              ring: 'ring-emerald-200',
            },
            {
              label: 'Active Listings',
              value: stats.properties.active.toString(),
              sub: `${stats.properties.total} total`,
              icon: Building2,
              color: 'bg-blue-50 text-blue-600',
              ring: 'ring-blue-200',
            },
            {
              label: 'Total Bookings',
              value: stats.bookings.total.toString(),
              sub: `${stats.bookings.pending} pending action`,
              icon: CalendarDays,
              color: 'bg-purple-50 text-purple-600',
              ring: 'ring-purple-200',
            },
            {
              label: 'Average Rating',
              value: stats.reviews.averageRating > 0 ? stats.reviews.averageRating.toFixed(1) : '—',
              sub: `${stats.reviews.total} reviews`,
              icon: Star,
              color: 'bg-amber-50 text-amber-600',
              ring: 'ring-amber-200',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}
                >
                  <card.icon className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-300" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.occupancyRate}%</div>
              <div className="text-xs text-gray-500">Occupancy Rate</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.bookings.pending}</div>
              <div className="text-xs text-gray-500">Pending Bookings</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.bookings.confirmed}</div>
              <div className="text-xs text-gray-500">Active Bookings</div>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Recent Bookings</h2>
            <Link
              href="/host/bookings"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No bookings yet. Once guests book your properties, they'll appear here.
              </div>
            ) : (
              recentBookings.map((booking) => {
                const config = statusConfig[booking.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={booking._id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    {booking.property?.images?.[0] && (
                      <div className="relative w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={booking.property.images[0].url} alt="" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {(booking.guest as any)?.name || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {booking.property?.title}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {formatDate(booking.checkIn, 'MMM d')} → {formatDate(booking.checkOut, 'MMM d')}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${config.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 flex-shrink-0 min-w-[70px] text-right">
                      {formatPrice(booking.pricing?.total || 0)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" />
              Notifications
            </h2>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.filter((n) => !n.read).length} new
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                All caught up! No new notifications.
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <Link
                  key={n.id}
                  href={n.action}
                  className="flex gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                      n.type === 'booking_pending'
                        ? 'bg-amber-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {n.type === 'booking_pending' ? '📅' : '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
