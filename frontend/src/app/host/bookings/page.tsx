'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { bookingsApi } from '@/lib/api';
import { Loader2, Check, X } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface Booking {
  _id: string;
  guest?: { name: string; email: string };
  property?: { title: string };
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  nights?: number;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Bookings', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  guest: { en: 'Guest', ar: '\u0627\u0644\u0636\u064a\u0641' },
  property: { en: 'Property', ar: '\u0627\u0644\u0639\u0642\u0627\u0631' },
  checkIn: { en: 'Check-in', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' },
  status: { en: 'Status', ar: '\u0627\u0644\u062d\u0627\u0644\u0629' },
  amount: { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
  actions: { en: 'Actions', ar: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a' },
  accept: { en: 'Accept', ar: '\u0642\u0628\u0648\u0644' },
  decline: { en: 'Decline', ar: '\u0631\u0641\u0636' },
  noBookings: { en: 'No bookings yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0628\u0639\u062f' },
  accepted: { en: 'Booking accepted', ar: '\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062d\u062c\u0632' },
  declined: { en: 'Booking declined', ar: '\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u062d\u062c\u0632' },
  error: { en: 'Failed to update booking', ar: '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u062c\u0632' },
  all: { en: 'All', ar: '\u0627\u0644\u0643\u0644' },
  pending: { en: 'Pending', ar: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' },
  confirmed: { en: 'Confirmed', ar: '\u0645\u0624\u0643\u062f' },
  cancelled: { en: 'Cancelled', ar: '\u0645\u0644\u063a\u064a' },
  completed: { en: 'Completed', ar: '\u0645\u0643\u062a\u0645\u0644' },
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function HostBookingsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'حجوزات المضيف' : 'Host Bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await bookingsApi.getHostBookings();
      setBookings(res.data.data || res.data || []);
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await bookingsApi.updateStatus(id, status);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status } : b))
      );
      toast.success(status === 'confirmed' ? t.accepted[lang] : t.declined[lang]);
    } catch {
      toast.error(t.error[lang]);
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t[s]?.[lang] || s}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          {t.noBookings[lang]}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  <th className="text-start p-3 font-medium text-gray-600">{t.actions[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-gray-900">{booking.guest?.name || '-'}</td>
                    <td className="p-3 text-gray-700">{booking.property?.title || '-'}</td>
                    <td className="p-3 text-gray-600">
                      {new Date(booking.checkIn).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(booking.checkOut).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        {t[booking.status]?.[lang] || booking.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-gray-900"><span dir="ltr"><SarSymbol /> {booking.totalPrice?.toLocaleString('en')}</span></td>
                    <td className="p-3">
                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                            title={t.accept[lang]}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title={t.decline[lang]}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
