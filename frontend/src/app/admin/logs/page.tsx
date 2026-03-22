'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface ActivityLog {
  _id: string;
  action: string;
  performedBy: string;
  performerName: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

const actionColors: Record<string, { bg: string; text: string }> = {
  property_approved: { bg: '#dcfce7', text: '#166534' },
  property_rejected: { bg: '#fee2e2', text: '#991b1b' },
  user_banned: { bg: '#fee2e2', text: '#991b1b' },
  user_unbanned: { bg: '#dbeafe', text: '#1e40af' },
  booking_cancelled: { bg: '#fef9c3', text: '#854d0e' },
  host_suspended: { bg: '#fee2e2', text: '#991b1b' },
  host_activated: { bg: '#dcfce7', text: '#166534' },
  property_created: { bg: '#dbeafe', text: '#1e40af' },
  booking_created: { bg: '#f3e8ff', text: '#6b21a8' },
  review_created: { bg: '#e0e7ff', text: '#3730a3' },
};

const actionLabels: Record<string, string> = {
  property_approved: 'Property Approved',
  property_rejected: 'Property Rejected',
  user_banned: 'User Banned',
  user_unbanned: 'User Unbanned',
  booking_cancelled: 'Booking Cancelled',
  host_suspended: 'Host Suspended',
  host_activated: 'Host Activated',
  property_created: 'Property Created',
  booking_created: 'Booking Created',
  review_created: 'Review Created',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getLogs({
        page,
        limit: 30,
        ...(actionFilter !== 'all' && { action: actionFilter }),
      });
      if (response.data?.success) {
        setLogs(response.data.data || []);
        setPagination(response.data.pagination || { total: 0, page: 1, pages: 1 });
      } else {
        setError(response.data?.message || 'Failed to load logs');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setError(message);
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [actionFilter]);

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Actions</option>
          <option value="property_approved">Property Approved</option>
          <option value="property_rejected">Property Rejected</option>
          <option value="property_created">Property Created</option>
          <option value="user_banned">User Banned</option>
          <option value="user_unbanned">User Unbanned</option>
          <option value="host_suspended">Host Suspended</option>
          <option value="host_activated">Host Activated</option>
          <option value="booking_created">Booking Created</option>
          <option value="booking_cancelled">Booking Cancelled</option>
          <option value="review_created">Review Created</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{pagination.total} logs</span>
      </div>

      {/* Logs List */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No activity logs found</div>
        ) : (
          <div>
            {logs.map((log, idx) => {
              const ac = actionColors[log.action] || { bg: '#f1f5f9', text: '#475569' };
              return (
                <div key={log._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ac.text, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ac.bg, color: ac.text }}>
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>by {log.performerName}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#475569' }}>{log.details}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} onClick={() => fetchLogs(i + 1)} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, cursor: 'pointer',
              background: pagination.page === i + 1 ? '#3b82f6' : '#fff', color: pagination.page === i + 1 ? '#fff' : '#475569',
            }}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
