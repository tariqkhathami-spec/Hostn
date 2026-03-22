'use client';

import { useEffect, useState } from 'react';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  bookingsCount: number;
  totalSpent: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; name: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hostn_token') : '';

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (search) params.set('search', search);

    const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      setUsers(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.success) {
      fetchUsers(pagination.page);
      setConfirmAction(null);
    }
    setActionLoading(false);
  };

  const fetchUserDetail = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSelectedUser(data.data);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchUsers(1); };

  const roleColors: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#f3e8ff', text: '#6b21a8' },
    host: { bg: '#dbeafe', text: '#1e40af' },
    guest: { bg: '#f1f5f9', text: '#475569' },
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 260, outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
          <option value="all">All Roles</option>
          <option value="guest">Guests</option>
          <option value="host">Hosts</option>
          <option value="admin">Admins</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{pagination.total} users</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>User</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Bookings</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Total Spent</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Joined</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
            ) : users.map(u => {
              const rc = roleColors[u.role] || roleColors.guest;
              return (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.avatar && <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{u.name}</div>
                        {u.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: rc.bg, color: rc.text }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{u.bookingsCount}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#0f172a' }}>SAR {u.totalSpent?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {u.isBanned ? (
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>Banned</span>
                    ) : (
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>Active</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => fetchUserDetail(u._id)} style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475569' }}>View</button>
                      {u.role !== 'admin' && (
                        u.isBanned ? (
                          <button onClick={() => setConfirmAction({ userId: u._id, action: 'unban', name: u.name })} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Unban</button>
                        ) : (
                          <button onClick={() => setConfirmAction({ userId: u._id, action: 'ban', name: u.name })} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Ban</button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#0f172a' }}>
              {confirmAction.action === 'ban' ? 'Ban User' : 'Unban User'}
            </h3>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
              Are you sure you want to {confirmAction.action} <strong>{confirmAction.name}</strong>?
              {confirmAction.action === 'ban' && ' They will not be able to access the platform.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAction(confirmAction.userId, confirmAction.action)} disabled={actionLoading}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: confirmAction.action === 'ban' ? '#ef4444' : '#10b981', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {actionLoading ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedUser(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedUser.avatar && <img src={selectedUser.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>{selectedUser.name}</h2>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{selectedUser.email}</span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Role:</span> <strong style={{ textTransform: 'capitalize' }}>{selectedUser.role}</strong></div>
              <div><span style={{ color: '#64748b' }}>Phone:</span> <strong>{selectedUser.phone || 'N/A'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Verified:</span> <strong>{selectedUser.isVerified ? 'Yes' : 'No'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: selectedUser.isBanned ? '#ef4444' : '#10b981' }}>{selectedUser.isBanned ? 'Banned' : 'Active'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Bookings:</span> <strong>{selectedUser.bookingsCount}</strong></div>
              <div><span style={{ color: '#64748b' }}>Total Spent:</span> <strong>SAR {selectedUser.totalSpent?.toLocaleString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Joined:</span> <strong>{new Date(selectedUser.createdAt).toLocaleDateString()}</strong></div>
            </div>
            {selectedUser.properties?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Properties ({selectedUser.properties.length})</h4>
                {selectedUser.properties.slice(0, 5).map((p: any) => (
                  <div key={p._id} style={{ fontSize: 13, color: '#475569', padding: '4px 0' }}>• {p.title}</div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setSelectedUser(null)} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
