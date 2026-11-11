'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';

interface LicenseRow {
  unitId: string;
  unitName: string;
  propertyName: string;
  city: string;
  host: { id: string; name?: string; phone?: string; email?: string } | null;
  license: {
    workType?: 'individual' | 'company';
    licenseNumber: string;
    nationalId: string;
    commercialRegister: string;
    documentUrl: string;
    expiryDate: string | null;
    status: string;
    rejectionReason: string;
  };
  submittedAt: string;
}

const STATUSES = ['pending', 'active', 'rejected', 'expired'] as const;

export default function AdminLicensesPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'تصاريح السياحة' : 'Tourism Permits');

  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending');
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const labels: Record<string, string> = {
    pending: isAr ? 'قيد المراجعة' : 'Pending',
    active: isAr ? 'معتمد' : 'Approved',
    rejected: isAr ? 'مرفوض' : 'Rejected',
    expired: isAr ? 'منتهي' : 'Expired',
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLicenses({ status });
      setRows(res.data.data || []);
    } catch {
      setRows([]);
      toast.error(isAr ? 'تعذّر تحميل التصاريح' : 'Could not load permits');
    } finally {
      setLoading(false);
    }
  }, [status, isAr]);

  useEffect(() => { load(); }, [load]);

  const review = async (row: LicenseRow, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = (window.prompt(isAr ? 'سبب الرفض (يظهر للمضيف):' : 'Reason for rejection (shown to the host):') || '').trim();
      if (!reason) return;
    } else if (!window.confirm(isAr ? `اعتماد تصريح الوحدة "${row.unitName}"؟` : `Approve the permit for "${row.unitName}"?`)) {
      return;
    }
    setBusy(row.unitId);
    try {
      await adminApi.reviewLicense(row.unitId, { action, reason });
      toast.success(action === 'approve' ? (isAr ? 'تم الاعتماد' : 'Approved') : (isAr ? 'تم الرفض' : 'Rejected'));
      await load();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || (isAr ? 'تعذّر تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setBusy(null);
    }
  };

  const day = (value: string | null) => (value ? new Date(value).toLocaleDateString(isAr ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB') : '—');
  const th = { textAlign: 'start' as const, padding: '12px 16px', fontWeight: 600, color: '#475569' };
  const td = { padding: '12px 16px', color: '#1e293b', verticalAlign: 'top' as const };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {isAr ? 'تصاريح وزارة السياحة' : 'Tourism Permits'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr ? 'راجع التصاريح التي يرسلها المضيفون ثم اعتمدها أو ارفضها مع ذكر السبب' : 'Review permits submitted by hosts, then approve or reject them with a reason'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: status === s ? '#3b82f6' : '#fff', color: status === s ? '#fff' : '#475569',
            boxShadow: status === s ? 'none' : '0 0 0 1px #e2e8f0',
          }}>
            {labels[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {isAr ? 'لا توجد تصاريح في هذه الحالة' : 'No permits in this status'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={th}>{isAr ? 'الوحدة' : 'Unit'}</th>
                <th style={th}>{isAr ? 'المضيف' : 'Host'}</th>
                <th style={th}>{isAr ? 'رقم التصريح' : 'Permit no.'}</th>
                <th style={th}>{isAr ? 'الهوية / السجل' : 'ID / CR'}</th>
                <th style={th}>{isAr ? 'الانتهاء' : 'Expiry'}</th>
                <th style={th}>{isAr ? 'المستند' : 'Document'}</th>
                <th style={th}>{isAr ? 'أُرسل في' : 'Submitted'}</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.unitId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{row.propertyName}</div>
                    <div style={{ color: '#64748b' }}>{[row.unitName, row.city].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={td}>
                    <div>{row.host?.name || '—'}</div>
                    <div style={{ color: '#64748b', direction: 'ltr', textAlign: 'start' }}>{row.host?.phone || row.host?.email || ''}</div>
                  </td>
                  <td style={{ ...td, direction: 'ltr', textAlign: 'start' }}>{row.license.licenseNumber || '—'}</td>
                  <td style={{ ...td, direction: 'ltr', textAlign: 'start' }}>{row.license.nationalId || row.license.commercialRegister || '—'}</td>
                  <td style={td}>{day(row.license.expiryDate)}</td>
                  <td style={td}>
                    {row.license.documentUrl ? (
                      <a href={row.license.documentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                        {isAr ? 'عرض' : 'View'}
                      </a>
                    ) : '—'}
                  </td>
                  <td style={td}>{day(row.submittedAt)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {row.license.status === 'rejected' && row.license.rejectionReason ? (
                      <div style={{ color: '#dc2626', maxWidth: 220, whiteSpace: 'normal' }}>{row.license.rejectionReason}</div>
                    ) : null}
                    {row.license.status !== 'active' && row.license.status !== 'expired' ? (
                      <button onClick={() => review(row, 'approve')} disabled={busy === row.unitId} style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: 13, marginInlineEnd: 8,
                      }}>
                        {isAr ? 'اعتماد' : 'Approve'}
                      </button>
                    ) : null}
                    {row.license.status !== 'rejected' ? (
                      <button onClick={() => review(row, 'reject')} disabled={busy === row.unitId} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: 13,
                      }}>
                        {isAr ? 'رفض' : 'Reject'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
