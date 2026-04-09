'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi } from '@/lib/api';
import { Building, CalendarCheck, DollarSign, Star, Loader2 } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface Stats {
  totalProperties: number;
  activeBookings: number;
  totalEarnings: number;
  averageRating: number;
}

interface RecentBooking {
  _id: string;
  guest?: { name: string };
  property?: { title: string };
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice?: number;
  pricing?: { total?: number };
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Host Dashboard', ar: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0636\u064a\u0641' },
  totalProperties: { en: 'Total Properties', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  activeBookings: { en: 'Active Bookings', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629' },
  totalEarnings: { en: 'Total Earnings', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u0631\u0628\u0627\u062d' },
  averageRating: { en: 'Average Rating', ar: '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u062a\u0642\u064a\u064a\u0645' },
  recentBookings: { en: 'Recent Bookings', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0623\u062e\u064a\u0631\u0629' },
  guest: { en: 'Guest', ar: '\u0627\u0644\u0636\u064a\u0641' },
  property: { en: 'Property', ar: '\u0627\u0644\u0639\u0642\u0627\u0631' },
  checkIn: { en: 'Check-in', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' },
  status: { en: 'Status', ar: '\u0627\u0644\u062d\u0627\u0644\u0629' },
  amount: { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
  noBookings: { en: 'No recent bookings', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u062d\u062f\u064a\u062b\u0629' },
  loading: { en: 'Loading...', ar: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...' },
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
  completed: { en: 'Completed', ar: 'مكتمل' },
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function HostDashboardPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'لوحة تحكم المضيف' : 'Host Dashboard');
  const [stats, setStats] = useState<Stats>({ totalProperties: 0, activeBookings: 0, totalEarnings: 0, averageRating: 0 });
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        hostApi.getStats(),
        hostApi.getRecentBookings(),
      ]);
      const raw = statsRes.data.data || statsRes.data;
      // Map nested backend response to flat stats shape
      setStats({
        totalProperties: raw.totalProperties ?? raw.properties?.total ?? 0,
        activeBookings: raw.activeBookings ?? raw.bookings?.confirmed ?? raw.bookings?.total ?? 0,
        totalEarnings: raw.totalEarnings ?? raw.earnings?.total ?? 0,
        averageRating: raw.averageRating ?? raw.reviews?.averageRating ?? 0,
      });
      setBookings(bookingsRes.data.data || bookingsRes.data || []);
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { key: 'totalProperties', value: stats.totalProperties, icon: Building, color: 'text-primary-600 bg-primary-50' },
    { key: 'activeBookings', value: stats.activeBookings, icon: CalendarCheck, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'totalEarnings', value: <span dir="ltr"><SarSymbol /> {stats.totalEarnings?.toLocaleString('en') || 0}</span>, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
    { key: 'averageRating', value: stats.averageRating?.toFixed(1) || '0.0', icon: Star, color: 'text-yellow-600 bg-yellow-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{t[card.key][lang]}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t.recentBookings[lang]}</h2>
        </div>
        {bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">{t.noBookings[lang]}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-start p-3 font-medium text-gray-600">{t.guest[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.property[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.checkIn[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.checkOut[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.status[lang]}</th>
                  <th className="text-start p-3 font-medium text-gray-600">{t.amount[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-gray-900">{booking.guest?.name || '-'}</td>
                    <td className="p-3 text-gray-700">{booking.property?.title || '-'}</td>
                    <td className="p-3 text-gray-600">{new Date(booking.checkIn).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US')}</td>
                    <td className="p-3 text-gray-600">{new Date(booking.checkOut).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[booking.status]?.[lang] || booking.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-gray-900"><span dir="ltr"><SarSymbol /> {(booking.pricing?.total || booking.totalPrice || 0).toLocaleString('en')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
