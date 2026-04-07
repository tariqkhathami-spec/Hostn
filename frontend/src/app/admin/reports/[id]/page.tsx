'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reportsApi } from '@/lib/api';
import { Report, ReportAction } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

const actionLabels: Record<ReportAction, string> = {
  none: 'No Action', warning: 'Issue Warning', suspension: 'Suspend User',
  listing_removed: 'Remove Listing', account_banned: 'Ban Account',
};

const statusOptions = ['pending', 'reviewing', 'resolved', 'dismissed'];

export default function AdminReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionForm, setActionForm] = useState({ status: 'resolved', actionTaken: 'none' as ReportAction, adminNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (id) loadReport(); }, [id]);

  const loadReport = async () => {
    try {
      const res = await reportsApi.getReport(id);
      setReport(res.data.data);
      if (res.data.data) {
        setActionForm(f => ({ ...f, status: res.data.data.status, actionTaken: res.data.data.actionTaken || 'none' }));
      }
    } catch {
      toast.error('Failed to load report');
      router.push('/admin/reports');
    } finally { setLoading(false); }
  };

  const handleAction = async () => {
    setSubmitting(true);
    try {
      await reportsApi.takeAction(id, actionForm);
      toast.success('Action taken successfully');
      loadReport();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading...</div>;
  if (!report) return null;

  const reporterName = typeof report.reporter === 'object' ? (report.reporter as { name?: string }).name : 'Unknown';

  return (
    <div>
      <Link href="/admin/reports" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>
        ← Back to reports
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 16 }}>
        {/* Report Details */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Report Details</h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Reporter</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{reporterName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Target Type</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{report.targetType}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Reason</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{report.reason.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
              <div style={{ fontSize: 14, color: '#1e293b' }}>{new Date(report.createdAt).toLocaleString('en')}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {report.description}
            </div>
          </div>

          {report.adminNotes && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Admin Notes</div>
              <div style={{ fontSize: 14, color: '#334155', background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                {report.adminNotes}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, alignSelf: 'flex-start' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Take Action</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Status</label>
            <select value={actionForm.status} onChange={e => setActionForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
              {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Action</label>
            <select value={actionForm.actionTaken} onChange={e => setActionForm(f => ({ ...f, actionTaken: e.target.value as ReportAction }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
              {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Admin Notes</label>
            <textarea value={actionForm.adminNotes} onChange={e => setActionForm(f => ({ ...f, adminNotes: e.target.value }))}
              placeholder="Notes about the action taken..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'none' }} />
          </div>

          <button onClick={handleAction} disabled={submitting} style={{
            width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none',
            background: actionForm.actionTaken === 'account_banned' ? '#dc2626' : actionForm.actionTaken === 'suspension' ? '#f59e0b' : '#3b82f6',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1,
          }}>
            {submitting ? 'Processing...' : 'Submit Action'}
          </button>

          {(actionForm.actionTaken === 'suspension' || actionForm.actionTaken === 'account_banned') && (
            <div style={{ marginTop: 8, padding: 8, background: '#fef2f2', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
              ⚠️ This action will affect the user&apos;s account. Make sure this is the right decision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
