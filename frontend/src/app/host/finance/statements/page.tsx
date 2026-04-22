'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import { ScrollText, Loader2, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn } from '@/lib/utils';

interface StatementSummary {
  _id: string;
  period: { month: number; year: number };
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  status: string;
  currency: string;
  isFallback?: boolean;
}

interface StatementEntry {
  date: string;
  type: string;
  description: string;
  descriptionAr?: string;
  reference: string;
  referenceId?: string;
  credit: number;
  debit: number;
  balance: number;
}

interface StatementDetail {
  _id: string;
  period: { month: number; year: number };
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  currency: string;
  entries: StatementEntry[];
  status: string;
  isFallback?: boolean;
}

const monthNames: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['\u064a\u0646\u0627\u064a\u0631', '\u0641\u0628\u0631\u0627\u064a\u0631', '\u0645\u0627\u0631\u0633', '\u0623\u0628\u0631\u064a\u0644', '\u0645\u0627\u064a\u0648', '\u064a\u0648\u0646\u064a\u0648', '\u064a\u0648\u0644\u064a\u0648', '\u0623\u063a\u0633\u0637\u0633', '\u0633\u0628\u062a\u0645\u0628\u0631', '\u0623\u0643\u062a\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062f\u064a\u0633\u0645\u0628\u0631'],
};

const t: Record<string, Record<string, string>> = {
  title: { en: 'Account Statements', ar: '\u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a' },
  latestStatements: { en: 'Latest Statements', ar: '\u0622\u062e\u0631 \u0643\u0634\u0648\u0641\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628' },
  selectStatement: { en: 'Select a statement to view details', ar: '\u0627\u062e\u062a\u0631 \u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' },
  openingBalance: { en: 'Opening Balance', ar: '\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0627\u0641\u062a\u062a\u0627\u062d\u064a' },
  closingBalance: { en: 'Closing Balance', ar: '\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062e\u062a\u0627\u0645\u064a' },
  totalCredits: { en: 'Total Credits', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a' },
  totalDebits: { en: 'Total Debits', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062d\u0648\u0628\u0627\u062a' },
  date: { en: 'Date', ar: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' },
  description: { en: 'Description', ar: '\u0627\u0644\u0648\u0635\u0641' },
  reference: { en: 'Reference', ar: '\u0627\u0644\u0645\u0631\u062c\u0639' },
  credit: { en: 'Credit', ar: '\u0625\u064a\u0631\u0627\u062f' },
  debit: { en: 'Debit', ar: '\u0645\u0633\u062d\u0648\u0628' },
  balance: { en: 'Balance', ar: '\u0627\u0644\u0631\u0635\u064a\u062f' },
  noStatements: { en: 'No statements available', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0643\u0634\u0648\u0641\u0627\u062a' },
  noStatementsDesc: { en: 'Statements will be generated once you have booking activity', ar: '\u0633\u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0643\u0634\u0648\u0641\u0627\u062a \u0628\u0645\u062c\u0631\u062f \u0648\u062c\u0648\u062f \u0646\u0634\u0627\u0637 \u062d\u062c\u0648\u0632\u0627\u062a' },
  noEntries: { en: 'No entries for this period', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0642\u064a\u0648\u062f \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u062a\u0631\u0629' },
};

export default function StatementsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a' : 'Statements');

  const [year, setYear] = useState(new Date().getFullYear());
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StatementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hostFinanceApi.getStatements({ year });
      const d = res.data?.data;
      setStatements(d?.statements || []);
      setSelectedId(null);
      setDetail(null);
    } catch {
      setStatements([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await hostFinanceApi.getStatementDetail(id);
      setDetail(res.data?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : statements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t.noStatements[lang]}</p>
          <p className="text-sm text-gray-400 mt-1">{t.noStatementsDesc[lang]}</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — statement list */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Year selector */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                <span className="text-sm font-semibold text-gray-900">{year}</span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  disabled={year >= new Date().getFullYear()}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase">
                  {t.latestStatements[lang]}
                </p>
                {statements.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => loadDetail(s._id)}
                    className={cn(
                      'w-full text-start px-3 py-3 rounded-lg transition-colors',
                      selectedId === s._id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <p className="font-medium text-gray-900 text-sm">
                      {monthNames[lang]?.[s.period.month - 1]} {s.period.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span dir="ltr"><SarSymbol /> {s.closingBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main — statement detail */}
          <div className="flex-1 min-w-0">
            {!selectedId ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ScrollText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">{t.selectStatement[lang]}</p>
              </div>
            ) : detailLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {monthNames[lang]?.[detail.period.month - 1]} {detail.period.year}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">{t.openingBalance[lang]}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        <span dir="ltr"><SarSymbol /> {detail.openingBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t.closingBalance[lang]}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        <span dir="ltr"><SarSymbol /> {detail.closingBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t.totalCredits[lang]}</p>
                      <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span dir="ltr"><SarSymbol /> {detail.totalCredits.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t.totalDebits[lang]}</p>
                      <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span dir="ltr"><SarSymbol /> {detail.totalDebits.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ledger table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {detail.entries.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">{t.noEntries[lang]}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <th className="text-start px-4 py-3 font-medium">{t.date[lang]}</th>
                            <th className="text-start px-4 py-3 font-medium">{t.description[lang]}</th>
                            <th className="text-start px-4 py-3 font-medium">{t.reference[lang]}</th>
                            <th className="text-end px-4 py-3 font-medium">{t.credit[lang]}</th>
                            <th className="text-end px-4 py-3 font-medium">{t.debit[lang]}</th>
                            <th className="text-end px-4 py-3 font-medium">{t.balance[lang]}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detail.entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {isAr && entry.descriptionAr ? entry.descriptionAr : entry.description}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs font-mono" dir="ltr">
                                {entry.reference ? entry.reference.slice(-8) : '-'}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {entry.credit > 0 ? (
                                  <span className="text-emerald-600 font-medium" dir="ltr">
                                    +<SarSymbol /> {entry.credit.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {entry.debit > 0 ? (
                                  <span className="text-red-600 font-medium" dir="ltr">
                                    -<SarSymbol /> {entry.debit.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap font-semibold text-gray-900" dir="ltr">
                                <SarSymbol /> {entry.balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
