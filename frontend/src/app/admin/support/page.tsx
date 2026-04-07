'use client';

import { useState, useEffect } from 'react';
import { supportApi } from '@/lib/api';
import { SupportTicket } from '@/types';
import Link from 'next/link';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Filter, Users } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#3b82f6', bg: '#eff6ff' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
  resolved: { label: 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f9fafb' },
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    try {
      const res = await supportApi.getAllTickets();
      setTickets(res.data.data || []);
      setStats(res.data.stats || {});
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Support Tickets</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Manage customer support requests</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'capitalize' }}>{cfg.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: cfg.color }}>{stats[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: filter === s ? '#3b82f6' : '#fff', color: filter === s ? '#fff' : '#475569',
            boxShadow: filter === s ? 'none' : '0 0 0 1px #e2e8f0',
          }}>
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          No tickets found
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Subject</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>User</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Priority</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Date</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => {
                const sc = statusConfig[ticket.status] || statusConfig.open;
                const userName = typeof ticket.user === 'object' ? (ticket.user as { name?: string }).name : 'Unknown';
                return (
                  <tr key={ticket._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>{ticket.subject}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{userName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12, textTransform: 'capitalize' }}>{ticket.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 12, textTransform: 'capitalize',
                        background: ticket.priority === 'high' ? '#fef2f2' : ticket.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                        color: ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#d97706' : '#16a34a',
                      }}>{ticket.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{new Date(ticket.createdAt).toLocaleDateString('en')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/support/${ticket._id}`} style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
