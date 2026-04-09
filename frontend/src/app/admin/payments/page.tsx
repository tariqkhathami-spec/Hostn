'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface PaymentItem {
  _id: string;
  user?: { name: string };
  userName?: string;
  amount: number;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  refunded: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
};

export default function AdminPaymentsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'المدفوعات' : 'Payments');

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPayments({ page });
      const data = res.data;
      setPayments(data.data || data.payments || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a' : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, isAr]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const refund = async (id: string) => {
    const reason = prompt(isAr ? '\u0633\u0628\u0628 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f:' : 'Reason for refund:');
    if (!reason) return;

    setRefundingId(id);
    try {
      await adminApi.refundPayment(id, { reason });
      toast.success(isAr ? '\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0628\u0646\u062c\u0627\u062d' : 'Payment refunded');
      loadPayments();
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f' : 'Refund failed');
    } finally {
      setRefundingId(null);
    }
  };

  const statusLabels: Record<string, string> = isAr
    ? { paid: '\u0645\u062f\u0641\u0648\u0639', pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631', refunded: '\u0645\u0633\u062a\u0631\u062f', failed: '\u0641\u0627\u0634\u0644' }
    : { paid: 'Paid', pending: 'Pending', refunded: 'Refunded', failed: 'Failed' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a' : 'Payment Oversight'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a' : 'View and manage payments'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u062f\u0641\u0648\u0639\u0627\u062a' : 'No payments found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639' : 'Payment ID'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0636\u064a\u0641' : 'Guest'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0645\u0628\u0644\u063a' : 'Amount'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' : 'Date'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0625\u062c\u0631\u0627\u0621' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {p.user?.name || p.userName || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span dir="ltr"><SarSymbol /> {p.amount?.toLocaleString('en')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[p.status] || 'bg-gray-50 text-gray-700'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'paid' && (
                        <button
                          onClick={() => refund(p._id)}
                          disabled={refundingId === p._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                        >
                          {refundingId === p._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          {isAr ? '\u0627\u0633\u062a\u0631\u062f\u0627\u062f' : 'Refund'}
                        </button>
                      )}
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
