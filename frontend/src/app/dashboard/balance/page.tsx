'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { walletApi } from '@/lib/api';
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2, Gift } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import { usePageTitle } from '@/lib/usePageTitle';

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  createdAt: string;
}

export default function BalancePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'الرصيد' : 'Balance');

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        const [balRes, txRes] = await Promise.allSettled([
          walletApi.getBalance(),
          walletApi.getTransactions(),
        ]);
        if (balRes.status === 'fulfilled') {
          const b = balRes.value.data?.data?.balance ?? balRes.value.data?.balance ?? user?.balance ?? 0;
          setBalance(b);
        } else {
          setBalance(user?.balance ?? 0);
        }
        if (txRes.status === 'fulfilled') {
          setTransactions(txRes.value.data?.data || txRes.value.data || []);
        }
      } catch {
        setBalance(user?.balance ?? 0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user?.balance]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? '\u0627\u0644\u0631\u0635\u064A\u062F' : 'Balance'}
        </h1>
        <p className="text-gray-500 mt-1">
          {lang === 'ar' ? '\u0631\u0635\u064A\u062F\u0643 \u0648\u0633\u062C\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A' : 'Your balance and transaction history'}
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">
              {lang === 'ar' ? '\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0627\u0644\u064A' : 'Current Balance'}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : <><span dir="ltr"><SarSymbol /> {balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" />
          {lang === 'ar'
            ? '\u064A\u0645\u0643\u0646 \u0625\u0636\u0627\u0641\u0629 \u0631\u0635\u064A\u062F \u0643\u0647\u062F\u064A\u0629 \u0623\u0648 \u062A\u0639\u0648\u064A\u0636 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629'
            : 'Balance can be added as gifts or compensation by admin'}
        </p>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {lang === 'ar' ? '\u0633\u062C\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A' : 'Transaction History'}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {lang === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0628\u0639\u062F' : 'No transactions yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {tx.type === 'credit'
                      ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description || (tx.type === 'credit'
                        ? (lang === 'ar' ? '\u0625\u0636\u0627\u0641\u0629 \u0631\u0635\u064A\u062F' : 'Credit')
                        : (lang === 'ar' ? '\u062E\u0635\u0645' : 'Debit')
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                  <span dir="ltr">{tx.type === 'credit' ? '+' : '-'}<SarSymbol /> {tx.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
