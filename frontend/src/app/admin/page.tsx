'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Users, Building, BookOpen, CreditCard, Loader2 } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface Stats {
  totalUsers: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
}

// Map the nested backend response to flat Stats
function mapStats(raw: Record<string, unknown>): Stats {
  // If already flat (totalUsers exists), use as-is
  if (typeof raw.totalUsers === 'number') return raw as unknown as Stats;
  // Otherwise map from nested structure
  const users = raw.users as { total?: number } | undefined;
  const properties = raw.properties as { total?: number } | undefined;
  const bookings = raw.bookings as { total?: number } | undefined;
  const payments = raw.payments as { revenue?: number } | undefined;
  return {
    totalUsers: users?.total ?? 0,
    totalProperties: properties?.total ?? 0,
    totalBookings: bookings?.total ?? 0,
    totalRevenue: payments?.revenue ?? 0,
  };
}

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'لوحة تحكم المدير' : 'Admin Dashboard');

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await adminApi.getStats();
      const raw = res.data.data || res.data;
      setStats(mapStats(raw));
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a' : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646' : 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Total Properties',
      value: stats?.totalProperties ?? 0,
      icon: Building,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' : 'Total Bookings',
      value: stats?.totalBookings ?? 0,
      icon: BookOpen,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a' : 'Total Revenue',
      value: stats?.totalRevenue ?? 0,
      icon: CreditCard,
      color: 'text-green-600',
      bg: 'bg-green-50',
      isCurrency: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645' : 'Admin Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629' : 'Platform overview'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {card.isCurrency
                  ? <span dir="ltr"><SarSymbol /> {card.value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  : card.value.toLocaleString('en')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
