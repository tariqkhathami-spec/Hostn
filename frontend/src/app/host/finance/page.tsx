'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import {
  DollarSign, Clock, Receipt, AlertTriangle,
  Banknote, FileText, ScrollText, CreditCard, Loader2, ArrowRight,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

interface SummaryData {
  totalPaidOut: number;
  pendingPayout: number;
  totalCommission: number;
  hasBankAccount: boolean;
  lastPayoutDate: string | null;
  lastPayoutAmount: number;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Finance', ar: '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' },
  totalPaidOut: { en: 'Total Paid Out', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u0627\u0644\u063a \u0627\u0644\u0645\u062d\u0648\u0644\u0629' },
  pendingPayout: { en: 'Pending Payout', ar: '\u0627\u0644\u0645\u0628\u0627\u0644\u063a \u0627\u0644\u0645\u0639\u0644\u0642\u0629' },
  totalCommission: { en: 'Total Commission', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0645\u0648\u0644\u0629' },
  noBankWarning: {
    en: 'Set up your payment method to receive payouts',
    ar: '\u0642\u0645 \u0628\u0625\u0639\u062f\u0627\u062f \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639 \u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a',
  },
  setupNow: { en: 'Set up now', ar: '\u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0622\u0646' },
  quickLinks: { en: 'Quick Links', ar: '\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064a\u0639\u0629' },
  remittances: { en: 'Remittances', ar: '\u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' },
  remittancesDesc: { en: 'View your bank transfers and payout history', ar: '\u0639\u0631\u0636 \u062a\u062d\u0648\u064a\u0644\u0627\u062a\u0643 \u0627\u0644\u0628\u0646\u0643\u064a\u0629 \u0648\u0633\u062c\u0644 \u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a' },
  invoices: { en: 'Invoices', ar: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631' },
  invoicesDesc: { en: 'Commission and fee invoices', ar: '\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0648\u0627\u0644\u0631\u0633\u0648\u0645' },
  statements: { en: 'Statements', ar: '\u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a' },
  statementsDesc: { en: 'Monthly account statements', ar: '\u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0634\u0647\u0631\u064a\u0629' },
  paymentMethod: { en: 'Payment Method', ar: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645' },
  paymentMethodDesc: { en: 'Manage your bank account and transfer settings', ar: '\u0625\u062f\u0627\u0631\u0629 \u062d\u0633\u0627\u0628\u0643 \u0627\u0644\u0628\u0646\u0643\u064a \u0648\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u062d\u0648\u064a\u0644' },
  lastPayout: { en: 'Last Payout', ar: '\u0622\u062e\u0631 \u062d\u0648\u0627\u0644\u0629' },
};

const quickLinks = [
  { href: '/finance/remittances', icon: Banknote, labelKey: 'remittances', descKey: 'remittancesDesc', color: 'bg-blue-50 text-blue-600' },
  { href: '/finance/invoices', icon: FileText, labelKey: 'invoices', descKey: 'invoicesDesc', color: 'bg-purple-50 text-purple-600' },
  { href: '/finance/statements', icon: ScrollText, labelKey: 'statements', descKey: 'statementsDesc', color: 'bg-teal-50 text-teal-600' },
  { href: '/finance/payment-method', icon: CreditCard, labelKey: 'paymentMethod', descKey: 'paymentMethodDesc', color: 'bg-orange-50 text-orange-600' },
];

export default function FinancePage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' : 'Finance');

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hostFinanceApi.getSummary()
      .then((res) => setData(res.data?.data || res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const summary = data || { totalPaidOut: 0, pendingPayout: 0, totalCommission: 0, hasBankAccount: false, lastPayoutDate: null, lastPayoutAmount: 0 };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Total Paid Out */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500">{t.totalPaidOut[lang]}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            <span dir="ltr"><SarSymbol /> {summary.totalPaidOut.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {summary.lastPayoutDate && (
            <p className="text-xs text-gray-400 mt-1">
              {t.lastPayout[lang]}: <span dir="ltr"><SarSymbol /> {summary.lastPayoutAmount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {' \u2014 '}
              {new Date(summary.lastPayoutDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Pending Payout */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">{t.pendingPayout[lang]}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            <span dir="ltr"><SarSymbol /> {summary.pendingPayout.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Total Commission */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500">{t.totalCommission[lang]}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            <span dir="ltr"><SarSymbol /> {summary.totalCommission.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>

      {/* No bank account warning */}
      {!summary.hasBankAccount && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800">{t.noBankWarning[lang]}</p>
          </div>
          <Link
            href="/finance/payment-method"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
          >
            {t.setupNow[lang]} <ArrowRight className="w-3.5 h-3.5 inline rtl:rotate-180" />
          </Link>
        </div>
      )}

      {/* Quick links */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.quickLinks[lang]}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ href, icon: Icon, labelKey, descKey, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                  {t[labelKey][lang]}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{t[descKey][lang]}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 mt-1 transition-colors rtl:rotate-180" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
