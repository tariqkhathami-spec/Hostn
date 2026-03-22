'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface HostUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  isBanned: boolean;
  bookingsCount: number;
  totalSpent: number;
}

interface HostDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isSuspended: boolean;
  properties: any[];
  propertiesCount: number;
  bookingsCount: number;
  reviewsCount: number;
  totalEarnings: number;
  averageRating: number;
  createdAt: string;
}

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<HostDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ hostId: string; action: string; name: string } | null>(null);

  const fetchHosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getHosts({
        role: 'host',
        limit: 50,
        ...(search && { search }),
      });
      if (response.data?.success) {
        setHosts(response.data.data || []);
      } else {
        setError(response.data?.message || 'Failed to load hosts');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setError(message);
      console.error('Fetch hosts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHosts(); }, []);

  const fetchHostDetail = async (hostId: string) => {
    try {
      const response = await adminApi.getHostDetail(hostId);
      if (response.data?.success) {
        setSelectedHost(response.data.data);
      } else {
        setActionError(response.data?.message || 'Failed to load host details');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load host details';
      setActionError(message);
      console.error('Fetch host detail error:', err);
    }
  };

  const handleAction = async (hostId: string, action: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const response = await adminApi.updateHost(hostId, action);
      if (response.data?.success) {
        fetchHosts();
        if (selectedHost?._id === hostId) fetchHostDetail(hostId);
        setConfirmAction(null);
      } else {
        setActionError(response.data?.message || 'Action failed');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'An error occurred';
      setActionError(message);
      console.error('Action error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchHosts(); };

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Search hosts..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 260, outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{hosts.length} hosts</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Host</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Verified</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Joined</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : hosts.map(h => (
              <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {h.avatar && <img src={h.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                    <div>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{h.name}</div>
                      {h.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.phone}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{h.email}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {h.isVerified ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: h.isBanned ? '#fee2e2' : '#dcfce7', color: h.isBanned ? '#991b1b' : '#166534' }}>
                    {h.isBanned ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => fetchHostDetail(h._id)} style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475569' }}>View</button>
                    {h.isBanned ? (
                      <button onClick={() => setConfirmAction({ hostId: h._id, action: 'activate', name: h.name })} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Activate</button>
                    ) : (
                      <button onClick={() => setConfirmAction({ hostId: h._id, action: 'suspend', name: h.name })} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#f59e0b', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Suspend</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>
              {confirmAction.action === 'suspend' ? 'Suspend Host' : 'Activate Host'}
            </h3>
            {actionError && (
              <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 12, marginBottom: 12 }}>
                {actionError}
              </div>
            )}
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
              Are you sure you want to {confirmAction.action} <strong>{confirmAction.name}</strong>?
              {confirmAction.action === 'suspend' && ' Their properties will be hidden from the platform.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmAction(null); setActionError(null); }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAction(confirmAction.hostId, confirmAction.action)} disabled={actionLoading}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: confirmAction.action === 'suspend' ? '#f59e0b' : '#10b981', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {actionLoading ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Detail Modal */}
      {selectedHost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedHost(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedHost.avatar && <img src={selectedHost.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedHost.name}</h2>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{selectedHost.email}</span>
                </div>
              </div>
              <button onClick={() => setSelectedHost(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Properties', value: selectedHost.propertiesCount, color: '#3b82f6' },
                { label: 'Bookings', value: selectedHost.bookingsCount, color: '#f59e0b' },
                { label: 'Reviews', value: selectedHost.reviewsCount, color: '#8b5cf6' },
                { label: 'Earnings', value: `SAR ${selectedHost.totalEarnings.toLocaleString()}`, color: '#10b981' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, marginBottom: 16 }}>
              <span style={{ color: '#64748b' }}>Average Rating:</span> <strong>★ {selectedHost.averageRating?.toFixed(1)}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: selectedHost.isSuspended ? '#ef4444' : '#10b981' }}>{selectedHost.isSuspended ? 'Suspended' : 'Active'}</strong>
            </div>

            {selectedHost.properties?.length > 0 && (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Properties</h4>
                {selectedHost.properties.map((p: any) => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span style={{ color: '#0f172a' }}>{p.title}</span>
                    <span style={{ color: '#64748b' }}>SAR {p.pricing?.perNight?.toLocaleString()}/night</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setSelectedHost(null)} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
