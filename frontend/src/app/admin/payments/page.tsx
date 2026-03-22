'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface Payment {
  _id: string;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  propertyTitle: string;
  amount: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  status: 'paid' | 'pending' | 'refunded';
  method: string;
  bookingStatus: string;
  createdAt: string;
}

interface Summary {
  totalRevenue: number;
  totalPending: number;
  totalRefunded: number;
  totalTransactions: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef9c3', text: '#854d0e' },
  refunded: { bg: '#f3e8ff', text: '#6b21a8' },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPayments({
        page,
        limit: 20,
        ...(filter !== 'all' && { status: filter }),
      });
      if (response.data?.success) {
        setPayments(response.data.data || []);
        setSummary(response.data.summary || null);
        setPagination(response.data.pagination || { total: 0, page: 1, pages: 1 });
      } else {
        setError(response.data?.message || 'Failed to load payments');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setError(message);
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [filter]);

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Total Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>SAR {summary.totalRevenue.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Pending</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>SAR {summary.totalPending.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Refunded</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>SAR {summary.totalRefunded.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{summary.totalTransactions}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{pagination.total} transactions</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Transaction</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Guest</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Property</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Method</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : payments.map(p => {
              const sc = statusColors[p.status] || statusColors.pending;
              return (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 12 }}>#{p._id.slice(-10)}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Booking: #{p.bookingId.slice(-8)}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{p.guestName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.guestEmail}</div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{p.propertyTitle}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>SAR {p.amount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{p.method}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} onClick={() => fetchPayments(i + 1)} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, cursor: 'pointer',
              background: pagination.page === i + 1 ? '#3b82f6' : '#fff', color: pagination.page === i + 1 ? '#fff' : '#475569',
            }}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
