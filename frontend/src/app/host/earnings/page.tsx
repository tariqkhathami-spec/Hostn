'use client';

import { useEffect, useState, useMemo } from 'react';
import { EarningsData } from '@/types';
import { hostApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { EarningsSkeleton } from '@/components/ui/PageSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Building2,
  Download,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  PieChart,
} from 'lucide-react';

type ViewTab = 'overview' | 'payouts';

interface Payout {
  id: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  date: string;
  method: string;
  reference: string;
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  useEffect(() => {
    loadEarnings();
  }, [year]);

  const loadEarnings = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await hostApi.getEarnings(year);
      setData(res.data.data);
    } catch {
      setError(true);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const maxMonthly = useMemo(() => {
    if (!data?.monthly) return 1;
    return Math.max(...data.monthly.map((m) => m.earnings), 1);
  }, [data]);

  // Compute trends
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthEarnings = data?.monthly?.find((m) => m.month === currentMonth)?.earnings || 0;
  const lastMonthEarnings = data?.monthly?.find((m) => m.month === currentMonth - 1)?.earnings || 0;
  const monthTrend =
    lastMonthEarnings > 0
      ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
      : 0;

  // Best month
  const bestMonth = useMemo(() => {
    if (!data?.monthly || data.monthly.length === 0) return null;
    return data.monthly.reduce((best, m) => (m.earnings > best.earnings ? m : best), data.monthly[0]);
  }, [data]);

  // Simulated payouts (would come from API in production)
  const payouts: Payout[] = useMemo(() => {
    if (!data) return [];
    const items: Payout[] = [];
    const completedMonths = data.monthly?.filter((m) => m.earnings > 0 && m.month < currentMonth) || [];
    completedMonths.forEach((m) => {
      items.push({
        id: `PAY-${year}-${String(m.month).padStart(2, '0')}`,
        amount: m.earnings * 0.85,
        status: 'completed',
        date: `${year}-${String(m.month).padStart(2, '0')}-28`,
        method: 'Bank Transfer',
        reference: `TXN${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      });
    });
    if (thisMonthEarnings > 0) {
      items.push({
        id: `PAY-${year}-${String(currentMonth).padStart(2, '0')}`,
        amount: thisMonthEarnings * 0.85,
        status: 'pending',
        date: `${year}-${String(currentMonth).padStart(2, '0')}-28`,
        method: 'Bank Transfer',
        reference: '—',
      });
    }
    return items.reverse();
  }, [data, year, currentMonth, thisMonthEarnings]);

  const totalPaid = payouts.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter((p) => p.status !== 'completed').reduce((s, p) => s + p.amount, 0);

  const exportCSV = () => {
    if (!data?.monthly) return;
    const rows = [
      ['Month', 'Earnings (SAR)', 'Bookings', 'Avg per Booking'],
      ...data.monthly.map((m) => [
        monthNames[m.month - 1],
        m.earnings.toString(),
        m.bookings.toString(),
        m.avgPerBooking.toString(),
      ]),
      ['', '', '', ''],
      ['Total', data.totalEarnings.toString(), data.totalBookings.toString(), data.avgPerBooking.toString()],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hostn-earnings-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <EarningsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Couldn't load earnings"
        message="We had trouble fetching your earnings data. Please try again."
        onRetry={loadEarnings}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Finance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your revenue, payouts, and financial performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2">
            <button
              onClick={() => setYear(year - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[4rem] text-center">
              {year}
            </span>
            <button
              onClick={() => setYear(year + 1)}
              disabled={year >= new Date().getFullYear()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['overview', 'payouts'] as ViewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'Payouts'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Earnings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                {monthTrend !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                      monthTrend > 0
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {monthTrend > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(monthTrend).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(data?.totalEarnings || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total earnings in {year}</p>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(thisMonthEarnings)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {monthNames[(currentMonth || 1) - 1]} {year} earnings
              </p>
            </div>

            {/* Total Bookings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {data?.totalBookings || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total bookings in {year}</p>
            </div>

            {/* Avg per Booking */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(data?.avgPerBooking || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Average per booking</p>
            </div>
          </div>

          {/* Monthly Chart + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Earnings Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  <h3 className="font-bold text-gray-900">Monthly Earnings</h3>
                </div>
                {bestMonth && bestMonth.earnings > 0 && (
                  <span className="text-xs text-gray-400">
                    Best: {monthNames[bestMonth.month - 1]} ({formatPrice(bestMonth.earnings)})
                  </span>
                )}
              </div>

              {data?.monthly && data.monthly.some((m) => m.earnings > 0) ? (
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
                    <span>{formatPrice(maxMonthly)}</span>
                    <span>{formatPrice(maxMonthly * 0.5)}</span>
                    <span>0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-16">
                    {/* Grid lines */}
                    <div className="relative h-52">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-dashed border-gray-100" />
                        <div className="border-b border-dashed border-gray-100" />
                        <div className="border-b border-gray-200" />
                      </div>

                      {/* Bars */}
                      <div className="relative flex items-end gap-1.5 h-full">
                        {data.monthly.map((m) => {
                          const height = maxMonthly > 0 ? (m.earnings / maxMonthly) * 100 : 0;
                          const isHovered = hoveredMonth === m.month;
                          const isCurrent = m.month === currentMonth && year === new Date().getFullYear();
                          return (
                            <div
                              key={m.month}
                              className="flex-1 flex flex-col items-center justify-end h-full relative"
                              onMouseEnter={() => setHoveredMonth(m.month)}
                              onMouseLeave={() => setHoveredMonth(null)}
                            >
                              {/* Tooltip */}
                              {isHovered && m.earnings > 0 && (
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                                  <p className="font-semibold">{monthNames[m.month - 1]} {year}</p>
                                  <p>{formatPrice(m.earnings)} · {m.bookings} bookings</p>
                                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                                </div>
                              )}
                              <div
                                className={`w-full max-w-[2.2rem] rounded-t-lg transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-primary-500 hover:bg-primary-600'
                                    : m.earnings > 0
                                    ? isHovered
                                      ? 'bg-primary-400'
                                      : 'bg-primary-300'
                                    : 'bg-gray-100'
                                }`}
                                style={{ height: `${Math.max(height, 3)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex gap-1.5 mt-2">
                      {data.monthly.map((m) => (
                        <div key={m.month} className="flex-1 text-center">
                          <span
                            className={`text-[10px] font-medium ${
                              m.month === currentMonth && year === new Date().getFullYear()
                                ? 'text-primary-600 font-bold'
                                : 'text-gray-400'
                            }`}
                          >
                            {monthNames[m.month - 1]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                  No earnings data for {year}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Top Properties */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-primary-500" />
                  <h3 className="font-semibold text-gray-900 text-sm">Top Properties</h3>
                </div>

                {data?.topProperties && data.topProperties.length > 0 ? (
                  <div className="space-y-3">
                    {data.topProperties.slice(0, 5).map((prop, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : idx === 1
                              ? 'bg-gray-100 text-gray-600'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {prop.title}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {prop.bookings} booking{prop.bookings !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                          {formatPrice(prop.earnings)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">No property data yet</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white">
                <h3 className="font-semibold text-sm mb-4 text-white/90">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70">Occupancy Rate</span>
                    <span className="text-sm font-bold">
                      {data?.totalBookings ? Math.min(Math.round((data.totalBookings / 365) * 100), 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width: `${data?.totalBookings ? Math.min(Math.round((data.totalBookings / 365) * 100), 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-white/70">Revenue/Night</span>
                    <span className="text-sm font-bold">
                      {formatPrice(
                        data?.totalBookings && data.totalBookings > 0
                          ? data.totalEarnings / data.totalBookings
                          : 0
                      )}
                    </span>
                  </div>
                  {bestMonth && bestMonth.earnings > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-white/70">Best Month</span>
                      <span className="text-sm font-bold">
                        {monthNames[bestMonth.month - 1]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Earnings by Property Type */}
          {data?.byType && Object.keys(data.byType).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <PieChart className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-gray-900">Earnings by Property Type</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(data.byType).map(([type, val]) => {
                  const amount = typeof val === 'number' ? val : val.earnings;
                  const bookings = typeof val === 'number' ? 0 : val.bookings;
                  const percentage =
                    data.totalEarnings > 0
                      ? ((amount / data.totalEarnings) * 100).toFixed(1)
                      : '0';
                  return (
                    <div
                      key={type}
                      className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-xs text-gray-500 capitalize mb-1 font-medium">{type}</p>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(amount)}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{percentage}% of total</p>
                      {bookings > 0 && (
                        <p className="text-[10px] text-gray-400">
                          {bookings} booking{bookings !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Monthly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Month</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Earnings</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Bookings</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Avg/Booking</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.monthly || []).map((m) => {
                    const share =
                      data && data.totalEarnings > 0
                        ? ((m.earnings / data.totalEarnings) * 100).toFixed(1)
                        : '0';
                    const isCurrent = m.month === currentMonth && year === new Date().getFullYear();
                    return (
                      <tr
                        key={m.month}
                        className={`border-b border-gray-50 last:border-0 ${
                          isCurrent ? 'bg-primary-50/40' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-3">
                          <span className={`text-sm font-medium ${isCurrent ? 'text-primary-700' : 'text-gray-900'}`}>
                            {monthNames[m.month - 1]}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">
                                Current
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                          {m.earnings > 0 ? formatPrice(m.earnings) : '—'}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600">{m.bookings || '—'}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600">
                          {m.avgPerBooking > 0 ? formatPrice(m.avgPerBooking) : '—'}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-400 rounded-full"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-10 text-right">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatPrice(data?.totalEarnings || 0)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {data?.totalBookings || 0}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatPrice(data?.avgPerBooking || 0)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'payouts' && (
        <>
          {/* Payout Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Total Paid Out</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {payouts.filter((p) => p.status === 'completed').length} completed payouts
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalPending)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {payouts.filter((p) => p.status !== 'completed').length} pending payout{payouts.filter((p) => p.status !== 'completed').length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Platform Fee</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">15%</p>
              <p className="text-xs text-gray-400 mt-1">Service commission rate</p>
            </div>
          </div>

          {/* Payout Method */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-gray-900">Payout Method</h3>
              </div>
              <button className="text-xs text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Edit
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Bank Transfer (IBAN)</p>
                <p className="text-xs text-gray-500 mt-0.5">SA •••• •••• •••• 4821</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Payouts processed on the 28th of each month</p>
              </div>
            </div>
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Payout History</h3>
            </div>

            {payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Payout ID</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Date</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Method</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Amount</th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className="text-sm font-mono text-gray-700">{payout.id}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {new Date(payout.date).toLocaleDateString('en-SA', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{payout.method}</td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatPrice(payout.amount)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              payout.status === 'completed'
                                ? 'bg-green-50 text-green-600'
                                : payout.status === 'processing'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {payout.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {payout.status === 'pending' && <Clock className="w-3 h-3" />}
                            {payout.status === 'processing' && <AlertCircle className="w-3 h-3" />}
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No payouts yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Payouts will appear here once you start receiving bookings
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
