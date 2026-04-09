'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi } from '@/lib/api';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface MonthlyEarning {
  month: string;
  year: number;
  total: number;
  bookings: number;
}

interface EarningsData {
  totalEarnings: number;
  monthlyBreakdown: MonthlyEarning[];
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Earnings', ar: '\u0627\u0644\u0623\u0631\u0628\u0627\u062d' },
  totalEarnings: { en: 'Total Earnings', ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u0631\u0628\u0627\u062d' },
  monthlyBreakdown: { en: 'Monthly Breakdown', ar: '\u0627\u0644\u062a\u0641\u0635\u064a\u0644 \u0627\u0644\u0634\u0647\u0631\u064a' },
  month: { en: 'Month', ar: '\u0627\u0644\u0634\u0647\u0631' },
  earnings: { en: 'Earnings', ar: '\u0627\u0644\u0623\u0631\u0628\u0627\u062d' },
  bookingsCount: { en: 'Bookings', ar: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  noData: { en: 'No earnings data available', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0623\u0631\u0628\u0627\u062d' },
};

const monthNames: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['\u064a\u0646\u0627\u064a\u0631', '\u0641\u0628\u0631\u0627\u064a\u0631', '\u0645\u0627\u0631\u0633', '\u0623\u0628\u0631\u064a\u0644', '\u0645\u0627\u064a\u0648', '\u064a\u0648\u0646\u064a\u0648', '\u064a\u0648\u0644\u064a\u0648', '\u0623\u063a\u0633\u0637\u0633', '\u0633\u0628\u062a\u0645\u0628\u0631', '\u0623\u0643\u062a\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062f\u064a\u0633\u0645\u0628\u0631'],
};

export default function HostEarningsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'الأرباح' : 'Earnings');
  const [data, setData] = useState<EarningsData>({ totalEarnings: 0, monthlyBreakdown: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const res = await hostApi.getEarnings();
      const raw = res.data?.data || res.data || {};
      setData({
        totalEarnings: raw.totalEarnings ?? raw.total ?? 0,
        monthlyBreakdown: raw.monthlyBreakdown ?? raw.monthly ?? [],
      });
    } catch {
      // Silently handle — show empty state instead of error toast
      setData({ totalEarnings: 0, monthlyBreakdown: [] });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Total Earnings Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t.totalEarnings[lang]}</p>
            <p className="text-3xl font-bold text-gray-900"><span dir="ltr"><SarSymbol /> {data.totalEarnings?.toLocaleString('en')}</span></p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">{t.monthlyBreakdown[lang]}</h2>
        </div>

        {data.monthlyBreakdown.length === 0 ? (
          <div className="p-12 text-center text-gray-400">{t.noData[lang]}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.monthlyBreakdown.map((item, idx) => {
              const monthIndex = parseInt(item.month, 10) - 1;
              const monthLabel = monthNames[lang]?.[monthIndex] || item.month;
              return (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">
                      {monthLabel} {item.year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.bookings} {t.bookingsCount[lang]}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600"><span dir="ltr"><SarSymbol /> {item.total?.toLocaleString('en')}</span></p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
