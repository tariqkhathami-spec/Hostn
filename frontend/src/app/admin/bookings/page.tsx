'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface AdminBooking {
  _id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  pricing: { total: number; perNight: number; nights: number; subtotal: number; cleaningFee: number; serviceFee: number };
  guests: { adults: number; children: number };
  guestName: string;
  guestEmail: string;
  propertyTitle: string;
  propertyCity: string;
  hostName: string;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
  rejected: { bg: '#fce7f3', text: '#9d174d' },
};

const paymentColors: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#dcfce7', text: '#166534' },
  unpaid: { bg: '#fef9c3', text: '#854d0e' },
  refunded: { bg: '#f3e8ff', text: '#6b21a8' },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getBookings({
        page,
        limit: 20,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentFilter !== 'all' && { paymentStatus: paymentFilter }),
        ...(search && { search }),
      });
      if (response.data?.success) {
        setBookings(response.data.data || []);
        setPagination(response.data.pagination || { total: 0, page: 1, pages: 1 });
      } else {
        setError(response.data?.message || 'Failed to load bookings');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setError(message);
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [statusFilter, paymentFilter]);

  const handleCancel = async (bookingId: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const response = await adminApi.updateBooking(bookingId, 'cancel');
      if (response.data?.success) {
        fetchBookings(pagination.page);
        setConfirmCancel(null);
      } else {
        setActionError(response.data?.message || 'Failed to cancel booking');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setActionError(message);
      console.error('Cancel booking error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchBookings(1); };

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 240, outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="refunded">Refunded</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{pagination.total} bookings</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Booking</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Guest</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Property</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Dates</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Payment</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No bookings found</td></tr>
            ) : bookings.map(b => {
              const sc = statusColors[b.status] || statusColors.pending;
              const pc = paymentColors[b.paymentStatus] || paymentColors.unpaid;
              return (
                <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 12 }}>#{b._id.slice(-8)}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{b.guestName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.guestEmail}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>{b.propertyTitle}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.propertyCity} · Host: {b.hostName}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: '#475569' }}>
                    {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>SAR {b.pricing?.total?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>{b.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: pc.bg, color: pc.text }}>{b.paymentStatus}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => setSelectedBooking(b)} style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475569' }}>View</button>
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button onClick={() => setConfirmCancel(b)} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      )}
                    </div>
                  </td>
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
            <button key={i} onClick={() => fetchBookings(i + 1)} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, cursor: 'pointer',
              background: pagination.page === i + 1 ? '#3b82f6' : '#fff', color: pagination.page === i + 1 ? '#fff' : '#475569',
            }}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedBooking(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Booking #{selectedBooking._id.slice(-8)}</h2>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Guest:</span> <strong>{selectedBooking.guestName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Host:</span> <strong>{selectedBooking.hostName}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b' }}>Property:</span> <strong>{selectedBooking.propertyTitle}</strong></div>
              <div><span style={{ color: '#64748b' }}>Check-in:</span> <strong>{new Date(selectedBooking.checkIn).toLocaleDateString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Check-out:</span> <strong>{new Date(selectedBooking.checkOut).toLocaleDateString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Nights:</span> <strong>{selectedBooking.pricing?.nights}</strong></div>
              <div><span style={{ color: '#64748b' }}>Guests:</span> <strong>{selectedBooking.guests?.adults} adults, {selectedBooking.guests?.children} children</strong></div>
            </div>
            <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Subtotal ({selectedBooking.pricing?.nights} nights × SAR {selectedBooking.pricing?.perNight})</span> <strong>SAR {selectedBooking.pricing?.subtotal?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Cleaning Fee</span> <strong>SAR {selectedBooking.pricing?.cleaningFee?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Service Fee</span> <strong>SAR {selectedBooking.pricing?.serviceFee?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}><span>Total</span> <span>SAR {selectedBooking.pricing?.total?.toLocaleString()}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setSelectedBooking(null)} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#ef4444' }}>Cancel Booking</h3>
            {actionError && (
              <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 12, marginBottom: 12 }}>
                {actionError}
              </div>
            )}
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
              Are you sure you want to cancel booking <strong>#{confirmCancel._id.slice(-8)}</strong> for <strong>{confirmCancel.guestName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmCancel(null); setActionError(null); }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Keep Booking</button>
              <button onClick={() => handleCancel(confirmCancel._id)} disabled={actionLoading}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
