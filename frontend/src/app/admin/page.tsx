'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  users: { total: number; guests: number; hosts: number; admins: number };
  properties: { total: number; pending?: number; rejected?: number; types: Record<string, number>; cities: Record<string, number> };
  bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
  payments: { totalRevenue: number; paid: number; unpaid: number };
  reviews: { total: number };
  moderation?: { pendingProperties: number; rejectedProperties: number; bannedUsers: number; suspendedHosts: number };
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  recentActivity: any[];
}

function StatCard({ label, value, sub, color, href }: { label: string; value: string | number; sub?: string; color: string; href?: string }) {
  const content = (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${color}`, cursor: href ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function Badge({ text, color }: { text: string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    blue: { bg: '#dbeafe', text: '#1e40af' },
    green: { bg: '#dcfce7', text: '#166534' },
    yellow: { bg: '#fef9c3', text: '#854d0e' },
    red: { bg: '#fee2e2', text: '#991b1b' },
    gray: { bg: '#f1f5f9', text: '#475569' },
    purple: { bg: '#f3e8ff', text: '#6b21a8' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>
      {text}
    </span>
  );
}

const actionColors: Record<string, string> = {
  property_approved: 'green',
  property_rejected: 'red',
  user_banned: 'red',
  user_unbanned: 'blue',
  booking_cancelled: 'yellow',
  host_suspended: 'red',
  host_activated: 'green',
  property_created: 'blue',
  booking_created: 'purple',
  review_created: 'blue',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hostn_token');
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading dashboard...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>Failed to load dashboard data</div>;
  }

  return (
    <div>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Users" value={data.users.total} sub={`${data.users.guests} guests, ${data.users.hosts} hosts`} color="#3b82f6" href="/admin/users" />
        <StatCard label="Total Properties" value={data.properties.total} sub={`${Object.keys(data.properties.types).length} types`} color="#8b5cf6" href="/admin/properties" />
        <StatCard label="Total Bookings" value={data.bookings.total} sub={`${data.bookings.pending} pending`} color="#f59e0b" href="/admin/bookings" />
        <StatCard label="Revenue" value={`SAR ${data.payments.totalRevenue.toLocaleString()}`} sub={`${data.payments.paid} paid bookings`} color="#10b981" href="/admin/payments" />
        <StatCard label="Reviews" value={data.reviews.total} color="#ec4899" />
        <StatCard label="Pending Bookings" value={data.bookings.pending} sub="Needs attention" color="#f97316" href="/admin/bookings" />
      </div>

      {/* Moderation Queue */}
      {data.moderation && (data.moderation.pendingProperties > 0 || data.moderation.bannedUsers > 0 || data.moderation.suspendedHosts > 0) && (
        <div style={{ background: '#fffbeb', borderRadius: 12, padding: 20, border: '1px solid #fde68a', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#92400e', margin: '0 0 12px' }}>⚠ Moderation Queue</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {data.moderation.pendingProperties > 0 && (
              <Link href="/admin/properties" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>{data.moderation.pendingProperties}</span>
                <span style={{ fontSize: 13, color: '#92400e' }}>properties awaiting review</span>
              </Link>
            )}
            {data.moderation.bannedUsers > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{data.moderation.bannedUsers}</span>
                <span style={{ fontSize: 13, color: '#92400e' }}>banned users</span>
              </div>
            )}
            {data.moderation.suspendedHosts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{data.moderation.suspendedHosts}</span>
                <span style={{ fontSize: 13, color: '#92400e' }}>suspended hosts</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Booking Status Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Booking Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Pending', value: data.bookings.pending, color: '#f59e0b', total: data.bookings.total },
              { label: 'Confirmed', value: data.bookings.confirmed, color: '#3b82f6', total: data.bookings.total },
              { label: 'Completed', value: data.bookings.completed, color: '#10b981', total: data.bookings.total },
              { label: 'Cancelled', value: data.bookings.cancelled, color: '#ef4444', total: data.bookings.total },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.value}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`, background: item.color, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Property Types */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Property Types</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.properties.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>{type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', background: '#f1f5f9', padding: '2px 10px', borderRadius: 12 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cities Distribution */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Properties by City</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(data.properties.cities).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
            <div key={city} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{count}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{city}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent Activity</h3>
          <Link href="/admin/logs" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>View all →</Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>No recent activity</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recentActivity.slice(0, 8).map((log: any) => (
              <div key={log._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <Badge text={log.action.replace(/_/g, ' ')} color={actionColors[log.action] || 'gray'} />
                <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{log.details}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
