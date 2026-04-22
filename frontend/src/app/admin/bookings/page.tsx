'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface PricingData {
  total?: number;
}

interface BookingItem {
  _id: string;
  guest?: { name: string };
  guestName?: string;
  property?: { title: string };
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  pricing?: PricingData;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-blue-50 text-blue-700',
  held: 'bg-orange-50 text-orange-700',
};

export default function AdminBookingsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'الحجوزات' : 'Bookings');

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBookings({ page });
      const data = res.data;
      setBookings(data.data || data.bookings || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, isAr]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الحجز نهائياً؟' : 'Are you sure you want to permanently delete this booking?')) return;

    // Optimistic: remove from UI immediately
    setBookings((prev) => prev.filter((b) => b._id !== id));
    toast.success(isAr ? 'تم حذف الحجز' : 'Booking deleted');

    try {
      await adminApi.deleteBooking(id);
    } catch {
      // If it truly failed, reload to restore
      loadBookings();
    }
  };

  const statusLabels: Record<string, string> = isAr
    ? { confirmed: '\u0645\u0624\u0643\u062f', pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631', cancelled: '\u0645\u0644\u063a\u064a', completed: '\u0645\u0643\u062a\u0645\u0644', held: '\u0645\u062d\u062c\u0648\u0632 \u0645\u0624\u0642\u062a\u0627\u064b' }
    : { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed', held: 'Held' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Booking Oversight'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'View all bookings'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a' : 'No bookings found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0631\u0642\u0645 \u0627\u0644\u062d\u062c\u0632' : 'Booking ID'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0636\u064a\u0641' : 'Guest'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0639\u0642\u0627\u0631' : 'Property'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' : 'Check-in'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' : 'Check-out'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0625\u062c\u0631\u0627\u0621\u0627\u062a' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {b._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {b.guest?.name || b.guestName || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.property?.title || b.propertyTitle || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(b.checkIn).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(b.checkOut).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[b.status] || 'bg-gray-50 text-gray-700'}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span dir="ltr"><SarSymbol /> {(b.pricing?.total || b.totalPrice)?.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(b._id)}
                        disabled={deleting === b._id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        {deleting === b._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
