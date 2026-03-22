'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { PaymentRecord, PaymentStatus } from '@/types';

interface Summary {
  totalRevenue: number;
  pendingAmount: number;
  failedCount: number;
  totalTransactions: number;
}

const statusColors: Record<PaymentStatus, { bg: string; text: string }> = {
  paid: { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef9c3', text: '#854d0e' },
  processing: { bg: '#dbeafe', text: '#0c4a6e' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
  refunded: { bg: '#f3e8ff', text: '#6b21a8' },
  cancelled: { bg: '#f1f5f9', text: '#334155' },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPayments({
        page,
        limit: 20,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      if (response.data?.success) {
        setPayments(response.data.data || []);
        setSummary(response.data.summary || calculateSummary(response.data.data || []));
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

  const calculateSummary = (data: PaymentRecord[]): Summary => {
    return {
      totalRevenue: data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: data.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      failedCount: data.filter(p => p.status === 'failed').length,
      totalTransactions: data.length,
    };
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, searchQuery]);

  const formatPaymentMethod = (payment: PaymentRecord) => {
    if (payment.cardBrand && payment.cardLast4) {
      return `${payment.cardBrand} ••••${payment.cardLast4}`;
    }
    return payment.paymentMethod || 'Pending';
  };

  const truncateId = (id: string, length: number = 12) => {
    return id.length > length ? `${id.substring(0, length)}...` : id;
  };

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
            <div style={{ fontSize: 13, color: '#64748b' }}>Pending Payments</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>SAR {summary.pendingAmount.toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Failed Payments</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{summary.failedCount}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Total Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{summary.totalTransactions}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PaymentStatus | 'all')}
          style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="text"
          placeholder="Search by guest name or property..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 13,
            width: 250,
            background: '#fff',
          }}
        />

        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>
          {pagination.total} transactions
        </span>
      </div>

      {/* Payments Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Payment ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Guest Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Property</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Payment Method</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Provider TX ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  Loading...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map(payment => {
                const sc = statusColors[payment.status as PaymentStatus] || statusColors.pending;
                return (
                  <tr key={payment._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 12 }}>
                        {truncateId(payment.providerPaymentId || payment._id)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{payment.guestName}</div>
                      {payment.guestEmail && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{payment.guestEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                      {payment.propertyTitle}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                      SAR {payment.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>
                      {formatPaymentMethod(payment)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11 }}>
                      {payment.providerPaymentId ? truncateId(payment.providerPaymentId, 8) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          /* Handle view details action */
                        }}
                        style={{
                          padding: '4px 12px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => fetchPayments(i + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                cursor: 'pointer',
                background: pagination.page === i + 1 ? '#3b82f6' : '#fff',
                color: pagination.page === i + 1 ? '#fff' : '#475569',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
