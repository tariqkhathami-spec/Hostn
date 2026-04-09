'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reportsApi } from '@/lib/api';
import { Report, ReportAction } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';

const getActionLabels = (isAr: boolean): Record<ReportAction, string> => ({
  none: isAr ? 'بدون إجراء' : 'No Action',
  warning: isAr ? 'إصدار تحذير' : 'Issue Warning',
  suspension: isAr ? 'تعليق المستخدم' : 'Suspend User',
  listing_removed: isAr ? 'إزالة الإعلان' : 'Remove Listing',
  account_banned: isAr ? 'حظر الحساب' : 'Ban Account',
});

const statusOptions = ['pending', 'reviewing', 'resolved', 'dismissed'];

const getStatusLabels = (isAr: boolean): Record<string, string> => ({
  pending: isAr ? 'قيد الانتظار' : 'Pending',
  reviewing: isAr ? 'قيد المراجعة' : 'Reviewing',
  resolved: isAr ? 'تم الحل' : 'Resolved',
  dismissed: isAr ? 'مرفوض' : 'Dismissed',
});

export default function AdminReportDetailPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'تفاصيل البلاغ' : 'Report Details');
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionForm, setActionForm] = useState({ status: 'resolved', actionTaken: 'none' as ReportAction, adminNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  const actionLabels = getActionLabels(isAr);
  const statusLabels = getStatusLabels(isAr);

  useEffect(() => { if (id) loadReport(); }, [id]);

  const loadReport = async () => {
    try {
      const res = await reportsApi.getReport(id);
      setReport(res.data.data);
      if (res.data.data) {
        setActionForm(f => ({ ...f, status: res.data.data.status, actionTaken: res.data.data.actionTaken || 'none' }));
      }
    } catch {
      toast.error(isAr ? 'فشل في تحميل البلاغ' : 'Failed to load report');
      router.push('/admin/reports');
    } finally { setLoading(false); }
  };

  const handleAction = async () => {
    setSubmitting(true);
    try {
      await reportsApi.takeAction(id, actionForm);
      toast.success(isAr ? 'تم اتخاذ الإجراء بنجاح' : 'Action taken successfully');
      loadReport();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (isAr ? 'فشل' : 'Failed'));
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (!report) return null;

  const reporterName = typeof report.reporter === 'object' ? (report.reporter as { name?: string }).name : (isAr ? 'غير معروف' : 'Unknown');

  return (
    <div>
      <Link href="/admin/reports" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>
        {isAr ? '→ العودة إلى البلاغات' : '← Back to reports'}
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 16 }}>
        {/* Report Details */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
            {isAr ? 'تفاصيل البلاغ' : 'Report Details'}
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {isAr ? 'المُبلِّغ' : 'Reporter'}
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{reporterName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {isAr ? 'نوع الهدف' : 'Target Type'}
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{report.targetType}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {isAr ? 'السبب' : 'Reason'}
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{report.reason.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {isAr ? 'التاريخ' : 'Date'}
              </div>
              <div style={{ fontSize: 14, color: '#1e293b' }}>{new Date(report.createdAt).toLocaleString(isAr ? 'ar-u-nu-latn' : 'en')}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {isAr ? 'الوصف' : 'Description'}
            </div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {report.description}
            </div>
          </div>

          {report.adminNotes && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {isAr ? 'ملاحظات المشرف' : 'Admin Notes'}
              </div>
              <div style={{ fontSize: 14, color: '#334155', background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                {report.adminNotes}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, alignSelf: 'flex-start' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
            {isAr ? 'اتخاذ إجراء' : 'Take Action'}
          </h2>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
              {isAr ? 'الحالة' : 'Status'}
            </label>
            <select value={actionForm.status} onChange={e => setActionForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
              {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
              {isAr ? 'الإجراء' : 'Action'}
            </label>
            <select value={actionForm.actionTaken} onChange={e => setActionForm(f => ({ ...f, actionTaken: e.target.value as ReportAction }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
              {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
              {isAr ? 'ملاحظات المشرف' : 'Admin Notes'}
            </label>
            <textarea value={actionForm.adminNotes} onChange={e => setActionForm(f => ({ ...f, adminNotes: e.target.value }))}
              placeholder={isAr ? 'ملاحظات حول الإجراء المتخذ...' : 'Notes about the action taken...'}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'none' }} />
          </div>

          <button onClick={handleAction} disabled={submitting} style={{
            width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none',
            background: actionForm.actionTaken === 'account_banned' ? '#dc2626' : actionForm.actionTaken === 'suspension' ? '#f59e0b' : '#3b82f6',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1,
          }}>
            {submitting ? (isAr ? 'جاري المعالجة...' : 'Processing...') : (isAr ? 'تنفيذ الإجراء' : 'Submit Action')}
          </button>

          {(actionForm.actionTaken === 'suspension' || actionForm.actionTaken === 'account_banned') && (
            <div style={{ marginTop: 8, padding: 8, background: '#fef2f2', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
              {isAr
                ? '⚠️ هذا الإجراء سيؤثر على حساب المستخدم. تأكد من صحة القرار.'
                : '⚠️ This action will affect the user\'s account. Make sure this is the right decision.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
