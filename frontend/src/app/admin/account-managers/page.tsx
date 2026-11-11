'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';

type StaffRole = 'super' | 'support' | 'finance' | 'account_manager';

interface StaffRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  adminRole: StaffRole;
  isSuspended: boolean;
  hosts: number;
}

interface AssignmentRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  properties: number;
  manager: { id: string; name: string } | null;
}

const ROLES: StaffRole[] = ['account_manager', 'support', 'finance', 'super'];

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

export default function AccountManagersPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'مدراء الحسابات' : 'Account Managers');

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [staffLoading, setStaffLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('account_manager');
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [rowsLoading, setRowsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);

  const roleLabels: Record<string, string> = {
    account_manager: isAr ? 'مدير حساب' : 'Account manager',
    support: isAr ? 'دعم' : 'Support',
    finance: isAr ? 'مالية' : 'Finance',
    super: isAr ? 'إدارة عليا' : 'Super admin',
  };

  const loadStaff = useCallback(async () => {
    try {
      const res = await adminApi.getStaff();
      setStaff(res.data.data || []);
      setUnassigned(res.data.unassignedHosts ?? 0);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحميل فريق العمل' : 'Could not load staff'));
    } finally {
      setStaffLoading(false);
    }
  }, [isAr]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    try {
      const params: { manager?: string; search?: string; page: number } = { page };
      if (managerFilter) params.manager = managerFilter;
      if (search) params.search = search;
      const res = await adminApi.getHostAssignments(params);
      setRows(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error: unknown) {
      setRows([]);
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحميل المضيفين' : 'Could not load hosts'));
    } finally {
      setRowsLoading(false);
    }
  }, [page, managerFilter, search, isAr]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadRows(); }, [loadRows]);

  // Search as the user types, after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const managers = staff.filter((member) => member.adminRole === 'account_manager');

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    // Accept 05XXXXXXXX or +9665XXXXXXXX and send the 9-digit form.
    const cleanPhone = phone.replace(/[^\d]/g, '').replace(/^(00966|966)/, '').replace(/^0/, '');
    if (!cleanName) {
      toast.error(isAr ? 'اكتب اسم الموظف' : 'Enter the staff member\'s name');
      return;
    }
    if (!/^5\d{8}$/.test(cleanPhone)) {
      toast.error(isAr ? 'رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5' : 'The mobile number must be 9 digits starting with 5');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createStaff({ name: cleanName, phone: cleanPhone, adminRole: role });
      toast.success(isAr ? 'تمت إضافة الموظف' : 'Staff member added');
      setName('');
      setPhone('');
      setRole('account_manager');
      await loadStaff();
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّرت إضافة الموظف' : 'Could not add the staff member'));
    } finally {
      setSaving(false);
    }
  };

  const assign = async (row: AssignmentRow, managerId: string) => {
    setBusy(row.id);
    try {
      await adminApi.assignAccountManager(row.id, managerId || null);
      toast.success(isAr ? 'تم تحديث مدير الحساب' : 'Account manager updated');
      await Promise.all([loadRows(), loadStaff()]);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحديث مدير الحساب' : 'Could not update the account manager'));
    } finally {
      setBusy(null);
    }
  };

  const distribute = async () => {
    const question = isAr
      ? `سيُسند ${unassigned} مضيفاً غير مسند إلى مدراء الحسابات الأقل حملاً. متابعة؟`
      : `${unassigned} unassigned host(s) will be given to the least-loaded account managers. Continue?`;
    if (!window.confirm(question)) return;
    setDistributing(true);
    try {
      const res = await adminApi.distributeHosts();
      const assigned = res.data.data?.assigned ?? 0;
      toast.success(isAr ? `تم إسناد ${assigned} مضيفاً` : `${assigned} host(s) assigned`);
      await Promise.all([loadRows(), loadStaff()]);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر التوزيع' : 'Distribution failed'));
    } finally {
      setDistributing(false);
    }
  };

  const th = { textAlign: 'start' as const, padding: '12px 16px', fontWeight: 600, color: '#475569' };
  const td = { padding: '12px 16px', color: '#1e293b', verticalAlign: 'middle' as const };
  const ltr = { direction: 'ltr' as const, textAlign: 'start' as const };
  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' };
  const input = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', color: '#1e293b' };
  const fieldLabel = { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, color: '#475569' };
  const sectionTitle = { fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '28px 0 12px' };
  const pagerBtn = (disabled: boolean) => ({
    padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  });

  const noManagers = managers.length === 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>{isAr ? 'مدراء الحسابات' : 'Account Managers'}</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr ? 'أضف فريق العمل ووزّع المضيفين على مدراء الحسابات' : 'Add staff and distribute hosts among account managers'}
        </p>
      </div>

      {/* Add staff */}
      <form onSubmit={addStaff} style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{isAr ? 'إضافة موظف' : 'Add a staff member'}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={fieldLabel}>
            {isAr ? 'الاسم' : 'Name'}
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, minWidth: 200 }} />
          </label>
          <label style={fieldLabel}>
            {isAr ? 'رقم الجوال' : 'Mobile number'}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              placeholder="5XXXXXXXX"
              style={{ ...input, ...ltr, minWidth: 160 }}
            />
          </label>
          <label style={fieldLabel}>
            {isAr ? 'الدور' : 'Role'}
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} style={{ ...input, minWidth: 150 }}>
              {ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </label>
          <button type="submit" disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? (isAr ? 'جاري الإضافة...' : 'Adding...') : (isAr ? 'إضافة' : 'Add')}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: '12px 0 0' }}>
          {isAr
            ? 'يسجّل الموظف دخوله برمز تحقق يُرسل إلى هذا الجوال، ولا يحتاج إلى كلمة مرور.'
            : 'The staff member signs in with a one-time code sent to this number; no password is needed.'}
        </p>
      </form>

      {/* Staff */}
      <h2 style={sectionTitle}>{isAr ? 'فريق العمل' : 'Staff'}</h2>
      {staffLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : staff.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>{isAr ? 'لا يوجد موظفون' : 'No staff yet'}</div>
      ) : (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={th}>{isAr ? 'الاسم' : 'Name'}</th>
                <th style={th}>{isAr ? 'الجوال' : 'Phone'}</th>
                <th style={th}>{isAr ? 'الدور' : 'Role'}</th>
                <th style={th}>{isAr ? 'عدد المضيفين' : 'Hosts'}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{member.name || '—'}</span>
                    {member.isSuspended ? (
                      <span style={{ marginInlineStart: 8, fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#fef2f2', color: '#dc2626' }}>
                        {isAr ? 'موقوف' : 'Suspended'}
                      </span>
                    ) : null}
                  </td>
                  <td style={{ ...td, ...ltr }}>{member.phone || '—'}</td>
                  <td style={td}>{roleLabels[member.adminRole] || member.adminRole}</td>
                  <td style={td}>{member.adminRole === 'account_manager' ? member.hosts : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Host distribution */}
      <h2 style={sectionTitle}>{isAr ? 'توزيع المضيفين' : 'Host Distribution'}</h2>
      <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: '#1e293b' }}>
          {isAr ? 'مضيفون بلا مدير حساب: ' : 'Hosts without an account manager: '}
          <strong style={{ color: unassigned > 0 ? '#d97706' : '#16a34a' }}>{unassigned}</strong>
        </span>
        <button
          onClick={distribute}
          disabled={distributing || unassigned === 0 || noManagers}
          style={{
            marginInlineStart: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: distributing || unassigned === 0 || noManagers ? 'not-allowed' : 'pointer',
            opacity: distributing || unassigned === 0 || noManagers ? 0.5 : 1,
          }}
        >
          {distributing ? (isAr ? 'جاري التوزيع...' : 'Distributing...') : (isAr ? 'وزّع غير المسندين تلقائياً' : 'Distribute unassigned automatically')}
        </button>
        {noManagers && !staffLoading ? (
          <div style={{ flexBasis: '100%', fontSize: 13, color: '#64748b' }}>
            {isAr ? 'أضف مدير حساب واحداً على الأقل لتتمكن من التوزيع.' : 'Add at least one account manager to distribute hosts.'}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={isAr ? 'ابحث باسم المضيف أو جواله...' : 'Search by host name or phone...'}
          aria-label={isAr ? 'بحث' : 'Search'}
          style={{ ...input, flex: 1, minWidth: 220 }}
        />
        <select
          value={managerFilter}
          onChange={(e) => { setManagerFilter(e.target.value); setPage(1); }}
          aria-label={isAr ? 'مدير الحساب' : 'Account manager'}
          style={{ ...input, minWidth: 180 }}
        >
          <option value="">{isAr ? 'كل المضيفين' : 'All hosts'}</option>
          <option value="none">{isAr ? 'غير المسندين' : 'Unassigned'}</option>
          {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
        </select>
      </div>

      {rowsLoading && rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'لا يوجد مضيفون مطابقون' : 'No matching hosts'}</div>
      ) : (
        <div style={{ ...card, overflowX: 'auto', opacity: rowsLoading ? 0.6 : 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={th}>{isAr ? 'المضيف' : 'Host'}</th>
                <th style={th}>{isAr ? 'الجوال' : 'Phone'}</th>
                <th style={th}>{isAr ? 'العقارات' : 'Properties'}</th>
                <th style={th}>{isAr ? 'مدير الحساب' : 'Account manager'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                // Keep the current manager selectable even if their role has since changed.
                const currentMissing = row.manager && !managers.some((manager) => manager.id === row.manager?.id);
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{row.name || '—'}</div>
                      {row.email ? <div style={{ color: '#64748b', ...ltr }}>{row.email}</div> : null}
                    </td>
                    <td style={{ ...td, ...ltr }}>{row.phone || '—'}</td>
                    <td style={td}>{row.properties}</td>
                    <td style={td}>
                      <select
                        value={row.manager?.id || ''}
                        disabled={busy === row.id}
                        onChange={(e) => assign(row, e.target.value)}
                        aria-label={isAr ? `مدير حساب ${row.name}` : `Account manager for ${row.name}`}
                        style={{ ...input, minWidth: 180 }}
                      >
                        <option value="">{isAr ? 'بدون مدير' : 'No manager'}</option>
                        {currentMissing && row.manager ? <option value={row.manager.id}>{row.manager.name}</option> : null}
                        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, fontSize: 13, color: '#475569' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={pagerBtn(page <= 1)}>
            {isAr ? 'السابق' : 'Previous'}
          </button>
          <span>
            {isAr ? `صفحة ${pagination.page} من ${pagination.pages} (${pagination.total} مضيف)` : `Page ${pagination.page} of ${pagination.pages} (${pagination.total} hosts)`}
          </span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} style={pagerBtn(page >= pagination.pages)}>
            {isAr ? 'التالي' : 'Next'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
