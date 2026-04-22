'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import { FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid';
  issuedAt: string;
  periodStart?: string;
  periodEnd?: string;
  breakdown?: {
    commissionRate: number;
    grossBookings: number;
    commission: number;
    vat: number;
    total: number;
  };
  createdAt: string;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Invoices', ar: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631' },
  invoiceNo: { en: 'Invoice No.', ar: '\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' },
  date: { en: 'Date', ar: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' },
  period: { en: 'Period', ar: '\u0627\u0644\u0641\u062a\u0631\u0629' },
  grossBookings: { en: 'Gross Bookings', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  commissionRate: { en: 'Commission Rate', ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  commission: { en: 'Commission', ar: '\u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  vat: { en: 'VAT', ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629' },
  total: { en: 'Total', ar: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' },
  statusDraft: { en: 'Draft', ar: '\u0645\u0633\u0648\u062f\u0629' },
  statusIssued: { en: 'Issued', ar: '\u0635\u0627\u062f\u0631\u0629' },
  statusPaid: { en: 'Paid', ar: '\u0645\u062f\u0641\u0648\u0639\u0629' },
  startDate: { en: 'Start Date', ar: '\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0641\u062a\u0631\u0629' },
  endDate: { en: 'End Date', ar: '\u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0641\u062a\u0631\u0629' },
  noData: { en: 'No invoices', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0648\u0627\u062a\u064a\u0631' },
  noDataDesc: { en: 'Invoices will appear here when commission fees are charged', ar: '\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0647\u0646\u0627 \u0639\u0646\u062f \u062e\u0635\u0645 \u0631\u0633\u0648\u0645 \u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  page: { en: 'Page', ar: '\u0635\u0641\u062d\u0629' },
  of: { en: 'of', ar: '\u0645\u0646' },
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

export default function InvoicesPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631' : 'Invoices');

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await hostFinanceApi.getInvoices(params);
      const d = res.data;
      setInvoices(d.data || []);
      setTotalPages(d.pagination?.pages || 1);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const statusLabel = (s: string) => {
    const key = `status${s.charAt(0).toUpperCase()}${s.slice(1)}` as keyof typeof t;
    return t[key]?.[lang] || s;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
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
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t.noData[lang]}</p>
          <p className="text-sm text-gray-400 mt-1">{t.noDataDesc[lang]}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {invoices.map((inv) => (
              <div key={inv._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900" dir="ltr">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(inv.issuedAt)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || ''}`}>
                    {statusLabel(inv.status)}
                  </span>
                </div>

                {/* Period */}
                {inv.periodStart && inv.periodEnd && (
                  <p className="text-xs text-gray-400 mb-3">
                    {t.period[lang]}: {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)}
                  </p>
                )}

                {/* Breakdown */}
                {inv.breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-400 text-xs">{t.grossBookings[lang]}</p>
                      <p className="font-medium text-gray-700">
                        <span dir="ltr"><SarSymbol /> {inv.breakdown.grossBookings.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">{t.commissionRate[lang]}</p>
                      <p className="font-medium text-gray-700">{inv.breakdown.commissionRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">{t.commission[lang]}</p>
                      <p className="font-medium text-gray-700">
                        <span dir="ltr"><SarSymbol /> {inv.breakdown.commission.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">{t.vat[lang]}</p>
                      <p className="font-medium text-gray-700">
                        <span dir="ltr"><SarSymbol /> {inv.breakdown.vat.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{t.total[lang]}</p>
                  <p className="text-lg font-bold text-gray-900">
                    <span dir="ltr"><SarSymbol /> {inv.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

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
