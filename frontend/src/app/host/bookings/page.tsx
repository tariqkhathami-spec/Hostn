'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Booking, BookingStatus } from '@/types';
import { bookingsApi } from '@/lib/api';
import { formatPrice, formatDate, calculateNights, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Mail,
  Phone,
  MessageSquare,
  DollarSign,
  X,
  ArrowUpDown,
  ChevronDown,
  Download,
  CalendarDays,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BookingsSkeleton } from '@/components/ui/PageSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Rejected', value: 'rejected' },
];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  confirmed: { color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  completed: { color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle2 },
  cancelled: { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  rejected: { color: 'text-gray-600', bg: 'bg-gray-100', icon: XCircle },
};

type SortKey = 'date' | 'amount' | 'checkin';
type SortDir = 'asc' | 'desc';

function HostBookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await bookingsApi.getHostBookings();
      setBookings(res.data.data || []);
    } catch {
      setError(true);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (bookingId: string, action: 'confirmed' | 'rejected') => {
    setActionLoading(bookingId);
    try {
      await bookingsApi.updateStatus(bookingId, action);
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: action as BookingStatus } : b))
      );
      toast.success(action === 'confirmed' ? 'Booking confirmed!' : 'Booking rejected');
      if (selectedBooking?._id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: action as BookingStatus });
      }
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => (filter === 'all' ? true : b.status === filter))
      .filter((b) => {
        if (dateRange === 'all') return true;
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const cutoff = new Date(now.getTime() - days * 86400000);
        return new Date(b.createdAt) >= cutoff;
      })
      .filter((b) =>
        search
          ? (b.guest as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
            (b.property as any)?.title?.toLowerCase().includes(search.toLowerCase()) ||
            b._id.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
          case 'amount': cmp = (a.pricing?.total || 0) - (b.pricing?.total || 0); break;
          case 'checkin': cmp = new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(); break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [bookings, filter, search, sortKey, sortDir, dateRange]);

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
  }), [bookings]);

  const totalRevenue = useMemo(() =>
    bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((s, b) => s + (b.pricing?.total || 0), 0),
    [bookings]
  );

  const exportCSV = () => {
    const rows = [['ID', 'Guest', 'Property', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status', 'Created']];
    filtered.forEach((b) => {
      rows.push([
        b._id,
        (b.guest as any)?.name || '',
        (b.property as any)?.title || '',
        b.checkIn,
        b.checkOut,
        calculateNights(b.checkIn, b.checkOut).toString(),
        (b.pricing?.total || 0).toString(),
        b.status,
        b.createdAt,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-sm text-gray-500 mt-1">{bookings.length} total bookings</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && bookings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{counts.pending}</p>
              <p className="text-[11px] text-gray-500">Pending</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{counts.confirmed}</p>
              <p className="text-[11px] text-gray-500">Confirmed</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{counts.completed}</p>
              <p className="text-[11px] text-gray-500">Completed</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
              <p className="text-[11px] text-gray-500">Revenue</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const count = counts[tab.value as keyof typeof counts] || 0;
            if (count === 0 && tab.value !== 'all' && tab.value !== 'pending') return null;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                  filter === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {tab.label}
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 sm:ml-auto items-center">
          {/* Date range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sortKey}-${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('-');
                setSortKey(k as SortKey);
                setSortDir(d as SortDir);
              }}
              className="pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="checkin-asc">Check-in soonest</option>
              <option value="checkin-desc">Check-in latest</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-40 sm:w-52 pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <BookingsSkeleton />
      ) : error ? (
        <ErrorState
          title="Couldn't load bookings"
          message="We had trouble fetching your bookings. Please try again."
          onRetry={loadBookings}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description={
            filter !== 'all' || search
              ? 'Try a different filter or search term.'
              : 'Bookings will appear here when guests book your properties.'
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Guest</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Property</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Dates</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((booking) => {
                  const guest = booking.guest as any;
                  const config = statusConfig[booking.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  const nights = calculateNights(booking.checkIn, booking.checkOut);

                  return (
                    <tr
                      key={booking._id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-bold text-xs">
                              {guest?.name?.charAt(0)?.toUpperCase() || 'G'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{guest?.name || 'Guest'}</p>
                            <p className="text-[11px] text-gray-400">{guest?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {(booking.property as any)?.images?.[0] && (
                            <div className="w-9 h-7 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                              <Image src={(booking.property as any).images[0].url} alt="" width={36} height={28} className="w-full h-full object-cover" unoptimized />
                            </div>
                          )}
                          <p className="text-sm text-gray-700 truncate max-w-[160px]">
                            {(booking.property as any)?.title || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-sm text-gray-700">
                          {formatDate(booking.checkIn, 'MMM d')} <ArrowRight className="w-3 h-3 inline text-gray-400" /> {formatDate(booking.checkOut, 'MMM d')}
                        </p>
                        <p className="text-[11px] text-gray-400">{nights} night{nights !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(booking.pricing?.total || 0)}
                        </p>
                        {booking.pricing?.perNight && (
                          <p className="text-[11px] text-gray-400">{formatPrice(booking.pricing.perNight)}/night</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize',
                          config.bg, config.color
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {booking.status === 'pending' && (
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleAction(booking._id, 'confirmed')}
                              isLoading={actionLoading === booking._id}
                              className="text-[11px] px-2.5 py-1.5"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleAction(booking._id, 'rejected')}
                              className="text-[11px] px-2.5 py-1.5"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Showing count */}
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        </div>
      )}

      {/* ─── Detail Modal ──────────────────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Booking Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">ID: {selectedBooking._id.slice(-8)}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status banner */}
              {(() => {
                const config = statusConfig[selectedBooking.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl', config.bg)}>
                    <StatusIcon className={cn('w-4 h-4', config.color)} />
                    <span className={cn('text-sm font-semibold capitalize', config.color)}>
                      {selectedBooking.status}
                    </span>
                    <span className={cn('text-xs ml-auto', config.color)}>
                      Booked {formatDate(selectedBooking.createdAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                );
              })()}

              {/* Guest */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold text-lg">
                    {(selectedBooking.guest as any)?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{(selectedBooking.guest as any)?.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {(selectedBooking.guest as any)?.email}
                    </span>
                    {(selectedBooking.guest as any)?.phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {(selectedBooking.guest as any)?.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Property */}
              <div className="flex items-center gap-3">
                {(selectedBooking.property as any)?.images?.[0] && (
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={(selectedBooking.property as any).images[0].url} alt="" fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{(selectedBooking.property as any)?.title}</p>
                  <p className="text-xs text-gray-500">{(selectedBooking.property as any)?.location?.city}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Check-in</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(selectedBooking.checkIn)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Check-out</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(selectedBooking.checkOut)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nights</p>
                  <p className="text-sm font-semibold text-gray-900">{calculateNights(selectedBooking.checkIn, selectedBooking.checkOut)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Guests</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedBooking.guests?.adults || 1} adult{(selectedBooking.guests?.adults || 1) !== 1 ? 's' : ''}
                    {selectedBooking.guests?.children ? `, ${selectedBooking.guests.children} child` : ''}
                  </p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Price Breakdown</h4>
                {selectedBooking.pricing?.perNight && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {formatPrice(selectedBooking.pricing.perNight)} x {selectedBooking.pricing.nights || calculateNights(selectedBooking.checkIn, selectedBooking.checkOut)} nights
                    </span>
                    <span className="font-medium">{formatPrice(selectedBooking.pricing.subtotal || (selectedBooking.pricing.perNight * (selectedBooking.pricing.nights || 1)))}</span>
                  </div>
                )}
                {selectedBooking.pricing?.cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cleaning fee</span>
                    <span className="font-medium">{formatPrice(selectedBooking.pricing.cleaningFee)}</span>
                  </div>
                )}
                {selectedBooking.pricing?.serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service fee</span>
                    <span className="font-medium">{formatPrice(selectedBooking.pricing.serviceFee)}</span>
                  </div>
                )}
                {selectedBooking.pricing?.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-{formatPrice(selectedBooking.pricing.discount)}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg text-primary-700">{formatPrice(selectedBooking.pricing?.total || 0)}</span>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Special Requests
                  </p>
                  <p className="text-sm text-amber-900">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {/* Actions */}
              {selectedBooking.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleAction(selectedBooking._id, 'confirmed')}
                    isLoading={actionLoading === selectedBooking._id}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Accept Booking
                  </Button>
                  <Button
                    className="flex-1"
                    variant="danger"
                    onClick={() => handleAction(selectedBooking._id, 'rejected')}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HostBookingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <HostBookingsContent />
    </Suspense>
  );
}
