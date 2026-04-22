'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import { Banknote, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

interface PayoutItem {
  _id: string;
  payoutNumber: string;
  amount: number;
  currency: string;
  status: 'upcoming' | 'processing' | 'executed' | 'failed';
  iban: string;
  bankName?: string;
  transferMethod: string;
  executedAt?: string;
  createdAt: string;
  bookingCount: number;
  breakdown?: {
    grossAmount: number;
    platformFee: number;
    vat: number;
    netAmount: number;
  };
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Remittances', ar: '\u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' },
  remittanceNo: { en: 'Remittance No.', ar: '\u0631\u0642\u0645 \u0627\u0644\u062d\u0648\u0627\u0644\u0629' },
  executionDate: { en: 'Execution Date', ar: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0646\u0641\u064a\u0630' },
  creationDate: { en: 'Creation Date', ar: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621' },
  transferMethod: { en: 'Transfer Method', ar: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u062d\u0648\u064a\u0644' },
  bankTransfer: { en: 'Bank Transfer', ar: '\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a' },
  ibanNo: { en: 'IBAN', ar: '\u0631\u0642\u0645 \u0627\u0644\u0627\u064a\u0628\u0627\u0646' },
  bookingsCount: { en: 'Bookings', ar: '\u0639\u062f\u062f \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  amount: { en: 'Amount', ar: '\u0645\u0628\u0644\u063a \u0627\u0644\u062d\u0648\u0627\u0644\u0629' },
  startDate: { en: 'Start Date', ar: '\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0641\u062a\u0631\u0629' },
  endDate: { en: 'End Date', ar: '\u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0641\u062a\u0631\u0629' },
  searchBooking: { en: 'Search by booking number', ar: '\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u062d\u062c\u0632' },
  statusUpcoming: { en: 'Upcoming', ar: '\u0642\u0627\u062f\u0645' },
  statusProcessing: { en: 'Processing', ar: '\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629' },
  statusExecuted: { en: 'Transferred', ar: '\u062a\u0645 \u0627\u0644\u062a\u062d\u0648\u064a\u0644' },
  statusFailed: { en: 'Failed', ar: '\u0641\u0634\u0644' },
  noData: { en: 'No remittances found', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0648\u0627\u0644\u0627\u062a \u0645\u0627\u0644\u064a\u0629' },
  noDataDesc: { en: 'Remittances will appear here once payouts are processed', ar: '\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0647\u0646\u0627 \u0628\u0645\u062c\u0631\u062f \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a' },
  page: { en: 'Page', ar: '\u0635\u0641\u062d\u0629' },
  of: { en: 'of', ar: '\u0645\u0646' },
};

function bookingCountText(count: number, isAr: boolean): string {
  if (!isAr) return `${count} ${count === 1 ? 'booking' : 'bookings'}`;
  if (count === 1) return '\u062d\u062c\u0632 \u0648\u0627\u062d\u062f';
  if (count === 2) return '\u062d\u062c\u0632\u064a\u0646';
  if (count >= 3 && count <= 10) return `${count} \u062d\u062c\u0648\u0632\u0627\u062a`;
  return `${count} \u062d\u062c\u0632`;
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  processing: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  executed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export default function RemittancesPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' : 'Remittances');

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (bookingNumber) params.bookingNumber = bookingNumber;
      if (statusFilter.length > 0) params.status = statusFilter.join(',');

      const res = await hostFinanceApi.getPayouts(params);
      const d = res.data;
      setPayouts(d.data || []);
      setTotalPages(d.pagination?.pages || 1);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, bookingNumber, statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const toggleStatus = (s: string) => {
    setPage(1);
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const statusLabel = (s: string) => {
    const key = `status${s.charAt(0).toUpperCase()}${s.slice(1)}` as keyof typeof t;
    return t[key]?.[lang] || s;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date range */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.startDate[lang]}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.endDate[lang]}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Booking search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.searchBooking[lang]}</label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={bookingNumber}
                onChange={(e) => { setBookingNumber(e.target.value); setPage(1); }}
                placeholder={t.searchBooking[lang]}
                className="w-full rounded-lg border border-gray-300 ps-9 pe-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['upcoming', 'processing', 'executed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter.includes(s)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t.noData[lang]}</p>
          <p className="text-sm text-gray-400 mt-1">{t.noDataDesc[lang]}</p>
        </div>
      ) : (
        <>
          {/* Payout cards */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {payouts.map((p) => (
              <div key={p._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900" dir="ltr">{p.payoutNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[p.status] || ''}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-3 gap-x-6 text-sm">
                  {p.executedAt && (
                    <div>
                      <p className="text-gray-400 text-xs">{t.executionDate[lang]}</p>
                      <p className="font-medium text-gray-700">{formatDate(p.executedAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs">{t.transferMethod[lang]}</p>
                    <p className="font-medium text-gray-700">{t.bankTransfer[lang]}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">{t.ibanNo[lang]}</p>
                    <p className="font-medium text-gray-700" dir="ltr">
                      {p.iban ? `${p.iban.slice(0, 4)}****${p.iban.slice(-4)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">{t.bookingsCount[lang]}</p>
                    <p className="font-medium text-gray-700">{bookingCountText(p.bookingCount, isAr)}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{t.amount[lang]}</p>
                  <p className="text-lg font-bold text-gray-900">
                    <span dir="ltr"><SarSymbol /> {p.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <span className="text-sm text-gray-600">
                {t.page[lang]} {page} {t.of[lang]} {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
