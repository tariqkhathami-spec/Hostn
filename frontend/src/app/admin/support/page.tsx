'use client';

import { useState, useEffect } from 'react';
import { supportApi } from '@/lib/api';
import { SupportTicket } from '@/types';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';

const getStatusConfig = (isAr: boolean): Record<string, { label: string; color: string; bg: string }> => ({
  open: { label: isAr ? 'مفتوح' : 'Open', color: '#3b82f6', bg: '#eff6ff' },
  in_progress: { label: isAr ? 'قيد المعالجة' : 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
  resolved: { label: isAr ? 'تم الحل' : 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
  closed: { label: isAr ? 'مغلق' : 'Closed', color: '#6b7280', bg: '#f9fafb' },
});

const getPriorityLabels = (isAr: boolean): Record<string, string> => ({
  high: isAr ? 'عالي' : 'High',
  medium: isAr ? 'متوسط' : 'Medium',
  low: isAr ? 'منخفض' : 'Low',
});

export default function AdminSupportPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'الدعم' : 'Support');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const scfg = getStatusConfig(isAr);
  const priorityLabels = getPriorityLabels(isAr);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    try {
      const res = await supportApi.getAllTickets();
      setTickets(res.data.data || []);
      setStats(res.data.stats || {});
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const filterLabels: Record<string, string> = {
    all: isAr ? 'الكل' : 'All',
    open: isAr ? 'مفتوح' : 'Open',
    in_progress: isAr ? 'قيد المعالجة' : 'In progress',
    resolved: isAr ? 'تم الحل' : 'Resolved',
    closed: isAr ? 'مغلق' : 'Closed',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {isAr ? 'تذاكر الدعم' : 'Support Tickets'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr ? 'إدارة طلبات دعم العملاء' : 'Manage customer support requests'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(scfg).map(([key, cfg]) => (
          <div key={key} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{cfg.label}</div>
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
            {filterLabels[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          {isAr ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {isAr ? 'لا توجد تذاكر' : 'No tickets found'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الموضوع' : 'Subject'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'المستخدم' : 'User'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'التصنيف' : 'Category'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الأولوية' : 'Priority'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => {
                const sc = scfg[ticket.status] || scfg.open;
                const userName = typeof ticket.user === 'object' ? (ticket.user as { name?: string }).name : (isAr ? 'غير معروف' : 'Unknown');
                return (
                  <tr key={ticket._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>{ticket.subject}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{userName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12, textTransform: 'capitalize' }}>{ticket.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 12,
                        background: ticket.priority === 'high' ? '#fef2f2' : ticket.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                        color: ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#d97706' : '#16a34a',
                      }}>{priorityLabels[ticket.priority] || ticket.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{new Date(ticket.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/support/${ticket._id}`} style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                        {isAr ? 'عرض' : 'View'}
                      </Link>
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
