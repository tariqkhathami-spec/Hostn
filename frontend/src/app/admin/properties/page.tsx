'use client';

import { useEffect, useState } from 'react';

interface AdminProperty {
  _id: string;
  title: string;
  type: string;
  location: { city: string; district?: string };
  pricing: { perNight: number };
  capacity: { maxGuests: number; bedrooms: number };
  ratings: { average: number; count: number };
  images: { url: string; isPrimary: boolean }[];
  host: { _id: string; name: string; email: string } | string;
  isActive: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  moderatedAt?: string;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hostn_token') : '';

  const fetchProperties = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (filter !== 'all') params.set('status', filter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (search) params.set('search', search);

    const res = await fetch(`/api/admin/properties?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      setProperties(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, [filter, typeFilter]);

  const handleModerate = async (propertyId: string, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(true);
    const res = await fetch(`/api/admin/properties/${propertyId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    if (data.success) {
      fetchProperties(pagination.page);
      setSelectedProperty(null);
      setShowRejectModal(false);
      setRejectReason('');
    }
    setActionLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(1);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 240, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>

        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Types</option>
          <option value="villa">Villa</option>
          <option value="chalet">Chalet</option>
          <option value="apartment">Apartment</option>
          <option value="studio">Studio</option>
          <option value="farm">Farm</option>
          <option value="camp">Camp</option>
          <option value="hotel">Hotel</option>
        </select>

        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{pagination.total} properties</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Property</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>City</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Host</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Price/Night</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Rating</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No properties found</td></tr>
            ) : properties.map(p => {
              const sc = statusColors[p.moderationStatus] || statusColors.pending;
              const hostName = typeof p.host === 'object' ? p.host.name : 'Unknown';
              const primaryImage = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url;
              return (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {primaryImage && <img src={primaryImage} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p._id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>{p.type}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{typeof p.location === 'object' ? p.location.city : ''}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{hostName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>SAR {p.pricing?.perNight?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ color: '#f59e0b' }}>★</span> {p.ratings?.average?.toFixed(1)} <span style={{ color: '#94a3b8' }}>({p.ratings?.count})</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                      {p.moderationStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => setSelectedProperty(p)} style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475569' }}>View</button>
                      {p.moderationStatus !== 'approved' && (
                        <button onClick={() => handleModerate(p._id, 'approve')} disabled={actionLoading} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Approve</button>
                      )}
                      {p.moderationStatus !== 'rejected' && (
                        <button onClick={() => { setSelectedProperty(p); setShowRejectModal(true); }} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Reject</button>
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
            <button key={i} onClick={() => fetchProperties(i + 1)} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, cursor: 'pointer',
              background: pagination.page === i + 1 ? '#3b82f6' : '#fff',
              color: pagination.page === i + 1 ? '#fff' : '#475569',
            }}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && !showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedProperty(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{selectedProperty.title}</h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>{typeof selectedProperty.location === 'object' ? `${selectedProperty.location.city}${selectedProperty.location.district ? ', ' + selectedProperty.location.district : ''}` : ''}</span>
              </div>
              <button onClick={() => setSelectedProperty(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Images */}
            {selectedProperty.images?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
                {selectedProperty.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img.url} alt="" style={{ width: 140, height: 100, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Type:</span> <strong style={{ textTransform: 'capitalize' }}>{selectedProperty.type}</strong></div>
              <div><span style={{ color: '#64748b' }}>Price/Night:</span> <strong>SAR {selectedProperty.pricing?.perNight?.toLocaleString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Guests:</span> <strong>{selectedProperty.capacity?.maxGuests}</strong></div>
              <div><span style={{ color: '#64748b' }}>Bedrooms:</span> <strong>{selectedProperty.capacity?.bedrooms}</strong></div>
              <div><span style={{ color: '#64748b' }}>Rating:</span> <strong>★ {selectedProperty.ratings?.average?.toFixed(1)} ({selectedProperty.ratings?.count})</strong></div>
              <div><span style={{ color: '#64748b' }}>Host:</span> <strong>{typeof selectedProperty.host === 'object' ? selectedProperty.host.name : 'Unknown'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Created:</span> <strong>{new Date(selectedProperty.createdAt).toLocaleDateString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Active:</span> <strong>{selectedProperty.isActive ? 'Yes' : 'No'}</strong></div>
            </div>

            {selectedProperty.rejectionReason && (
              <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
                <strong>Rejection Reason:</strong> {selectedProperty.rejectionReason}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              {selectedProperty.moderationStatus !== 'approved' && (
                <button onClick={() => handleModerate(selectedProperty._id, 'approve')} disabled={actionLoading} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#10b981', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                  {actionLoading ? '...' : 'Approve'}
                </button>
              )}
              {selectedProperty.moderationStatus !== 'rejected' && (
                <button onClick={() => setShowRejectModal(true)} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                  Reject
                </button>
              )}
              <button onClick={() => setSelectedProperty(null)} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#475569', fontSize: 14, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedProperty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Reject Property</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>"{selectedProperty.title}"</p>
            <textarea
              placeholder="Enter rejection reason (required)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => handleModerate(selectedProperty._id, 'reject', rejectReason)}
                disabled={!rejectReason.trim() || actionLoading}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: rejectReason.trim() ? '#ef4444' : '#fca5a5', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
