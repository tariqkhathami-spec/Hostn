'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

interface InvoiceBooking {
  _id: string;
  reference?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  pricing?: { total?: number };
  guest?: { name?: string };
  property?: { title?: string; titleAr?: string };
}

interface Invoice {
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
  bookings?: InvoiceBooking[];
  createdAt: string;
}

const t: Record<string, Record<string, string>> = {
  pageTitle: { en: 'Invoice Details', ar: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' },
  back: { en: 'Back to invoices', ar: '\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631' },
  print: { en: 'Print', ar: '\u0637\u0628\u0627\u0639\u0629' },
  invoiceNo: { en: 'Invoice No.', ar: '\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' },
  issuedAt: { en: 'Issued', ar: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0635\u062f\u0627\u0631' },
  period: { en: 'Period', ar: '\u0627\u0644\u0641\u062a\u0631\u0629' },
  breakdown: { en: 'Breakdown', ar: '\u0627\u0644\u062a\u0641\u0635\u064a\u0644' },
  grossBookings: { en: 'Gross bookings', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  commissionRate: { en: 'Commission rate', ar: '\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  commission: { en: 'Commission', ar: '\u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  vat: { en: 'VAT (15%)', ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 (15%)' },
  total: { en: 'Total due', ar: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062d\u0642' },
  bookingsIncluded: { en: 'Bookings included', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0634\u0645\u0648\u0644\u0629' },
  reference: { en: 'Ref', ar: '\u0627\u0644\u0645\u0631\u062c\u0639' },
  guest: { en: 'Guest', ar: '\u0627\u0644\u0636\u064a\u0641' },
  property: { en: 'Property', ar: '\u0627\u0644\u0639\u0642\u0627\u0631' },
  checkIn: { en: 'Check-in', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  checkOut: { en: 'Check-out', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' },
  amount: { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
  statusDraft: { en: 'Draft', ar: '\u0645\u0633\u0648\u062f\u0629' },
  statusIssued: { en: 'Issued', ar: '\u0635\u0627\u062f\u0631\u0629' },
  statusPaid: { en: 'Paid', ar: '\u0645\u062f\u0641\u0648\u0639\u0629' },
  notFound: { en: 'Invoice not found', ar: '\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629' },
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'تفاصيل الفاتورة' : 'Invoice Details');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    hostFinanceApi.getInvoiceDetail(id)
      .then((res) => setInvoice(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const propertyName = (b: InvoiceBooking) =>
    (isAr ? b.property?.titleAr : b.property?.title) || b.property?.title || b.property?.titleAr || '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-400">{t.notFound[lang]}</p>
        <Link href="/finance/invoices" className="text-primary-600 hover:underline mt-4 inline-block">
          {t.back[lang]}
        </Link>
      </div>
    );
  }

  const bd = invoice.breakdown;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top bar (hidden when printing) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/finance/invoices" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t.back[lang]}
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          {t.print[lang]}
        </button>
      </div>

      {/* Invoice sheet */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-10 print:border-0 print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Hostn</div>
            <div className="text-xs text-gray-500">hostn.co</div>
          </div>
          <div className="text-end">
            <div className="text-xs text-gray-500 mb-1">{t.invoiceNo[lang]}</div>
            <div className="font-mono font-bold text-gray-900">{invoice.invoiceNumber}</div>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[invoice.status]}`}>
              {t[`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`]?.[lang] || invoice.status}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-1">{t.issuedAt[lang]}</div>
            <div className="font-medium text-gray-900">{formatDate(invoice.issuedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{t.period[lang]}</div>
            <div className="font-medium text-gray-900">
              {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        {bd && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 mb-3">{t.breakdown[lang]}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={t.grossBookings[lang]} value={<span dir="ltr"><SarSymbol /> {bd.grossBookings.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
              <Row label={t.commissionRate[lang]} value={<span dir="ltr">{bd.commissionRate}%</span>} />
              <Row label={t.commission[lang]} value={<span dir="ltr"><SarSymbol /> {bd.commission.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
              <Row label={t.vat[lang]} value={<span dir="ltr"><SarSymbol /> {bd.vat.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 text-base font-bold text-gray-900">
                <dt>{t.total[lang]}</dt>
                <dd dir="ltr"><SarSymbol /> {bd.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Bookings included */}
        {invoice.bookings && invoice.bookings.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-3">{t.bookingsIncluded[lang]}</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-start p-3 font-medium text-gray-600 text-xs">{t.reference[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600 text-xs">{t.guest[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600 text-xs">{t.property[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600 text-xs">{t.checkIn[lang]}</th>
                    <th className="text-start p-3 font-medium text-gray-600 text-xs">{t.checkOut[lang]}</th>
                    <th className="text-end p-3 font-medium text-gray-600 text-xs">{t.amount[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.bookings.map((b) => (
                    <tr key={b._id} className="border-t border-gray-200">
                      <td className="p-3 font-mono text-xs text-gray-600">{b.reference || '-'}</td>
                      <td className="p-3 text-gray-900">{b.guest?.name || '-'}</td>
                      <td className="p-3 text-gray-700">{propertyName(b)}</td>
                      <td className="p-3 text-gray-600">{formatDate(b.checkIn)}</td>
                      <td className="p-3 text-gray-600">{formatDate(b.checkOut)}</td>
                      <td className="p-3 text-end font-medium text-gray-900">
                        {b.pricing?.total ? (
                          <span dir="ltr"><SarSymbol /> {b.pricing.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
