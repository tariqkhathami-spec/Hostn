'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '@/lib/api';
import { Report } from '@/types';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';

const statusConfig = (isAr: boolean): Record<string, { label: string; color: string; bg: string }> => ({
  pending: { label: isAr ? 'قيد الانتظار' : 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  reviewing: { label: isAr ? 'قيد المراجعة' : 'Reviewing', color: '#3b82f6', bg: '#eff6ff' },
  resolved: { label: isAr ? 'تم الحل' : 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
  dismissed: { label: isAr ? 'مرفوض' : 'Dismissed', color: '#6b7280', bg: '#f9fafb' },
});

const getReasonLabels = (isAr: boolean): Record<string, string> => ({
  inappropriate_content: isAr ? 'محتوى غير لائق' : 'Inappropriate Content',
  fraud: isAr ? 'احتيال' : 'Fraud',
  harassment: isAr ? 'مضايقة' : 'Harassment',
  misleading_listing: isAr ? 'إعلان مضلل' : 'Misleading Listing',
  safety_concern: isAr ? 'مخاوف أمنية' : 'Safety',
  discrimination: isAr ? 'تمييز' : 'Discrimination',
  property_damage: isAr ? 'أضرار بالعقار' : 'Property Damage',
  noise_violation: isAr ? 'إزعاج' : 'Noise',
  cancellation_abuse: isAr ? 'إساءة استخدام الإلغاء' : 'Cancellation Abuse',
  other: isAr ? 'أخرى' : 'Other',
});

export default function AdminReportsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'البلاغات' : 'Reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const scfg = statusConfig(isAr);
  const reasonLabels = getReasonLabels(isAr);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await reportsApi.getAllReports();
      setReports(res.data.data || []);
      setStats(res.data.stats || {});
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const filterLabels: Record<string, string> = {
    all: isAr ? 'الكل' : 'All',
    pending: isAr ? 'قيد الانتظار' : 'Pending',
    reviewing: isAr ? 'قيد المراجعة' : 'Reviewing',
    resolved: isAr ? 'تم الحل' : 'Resolved',
    dismissed: isAr ? 'مرفوض' : 'Dismissed',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {isAr ? 'البلاغات والشكاوى' : 'Reports & Complaints'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr ? 'مراجعة واتخاذ إجراء بشأن بلاغات المستخدمين' : 'Review and take action on user reports'}
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
        {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map(s => (
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
          {isAr ? 'لا توجد بلاغات' : 'No reports found'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'المُبلِّغ' : 'Reporter'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الهدف' : 'Target'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'السبب' : 'Reason'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                <th style={{ textAlign: 'start', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(report => {
                const sc = scfg[report.status] || scfg.pending;
                const reporterName = typeof report.reporter === 'object' ? (report.reporter as { name?: string }).name : (isAr ? 'غير معروف' : 'Unknown');
                return (
                  <tr key={report._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#1e293b' }}>{reporterName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12, textTransform: 'capitalize' }}>
                        {report.targetType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{reasonLabels[report.reason] || report.reason}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textTransform: 'capitalize', fontSize: 12 }}>
                      {report.actionTaken === 'none' ? '-' : report.actionTaken?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{new Date(report.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/reports/${report._id}`} style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                        {isAr ? 'مراجعة' : 'Review'}
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
