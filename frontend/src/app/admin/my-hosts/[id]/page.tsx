'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface HostDetail {
  host: { id: string; name: string; phone: string; email: string; joinedAt: string; isSuspended: boolean };
  properties: { id: string; title: string; type: string; city: string; isApproved: boolean; isActive: boolean; moderationNote: string; createdAt: string }[];
  licenses: {
    unitId: string; unitName: string; propertyName: string; licenseNumber: string;
    status: 'pending' | 'active' | 'expired' | 'rejected'; expiryDate: string | null; documentUrl: string; rejectionReason: string;
  }[];
  bookings: { id: string; reference: string; propertyName: string; guestName: string; checkIn: string; checkOut: string; status: string; paymentStatus: string; total: number }[];
  tickets: { id: string; subject: string; category: string; status: string; priority: string; updatedAt: string }[];
  finance: {
    bookingsValue: number; bookingsCount: number; paidOut: number;
    payouts: { id: string; number: string; amount: number; status: string; date: string }[];
  };
}

interface TicketThread {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: string;
  hostId: string;
  createdAt: string;
  updatedAt: string;
  messages: { id: string; fromHost: boolean; content: string; createdAt: string }[];
}

const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

export default function MyHostDetailPage() {
  const params = useParams();
  const hostId = String(params?.id || '');
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [data, setData] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');

  usePageTitle(data?.host.name || (isAr ? 'مضيفيّ' : 'My Hosts'));

  // `quiet` keeps the page on screen while it refreshes after an action.
  const load = useCallback(async (quiet = false) => {
    if (!hostId) return;
    if (!quiet) setLoading(true);
    try {
      const res = await adminApi.managerHost(hostId);
      setData(res.data.data || null);
    } catch (error: unknown) {
      if (!quiet) setData(null);
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحميل بيانات المضيف' : 'Could not load the host'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [hostId, isAr]);

  useEffect(() => { load(); }, [load]);

  const bookingStatus: Record<string, string> = {
    pending: isAr ? 'بانتظار قبول المضيف' : 'Awaiting host',
    held: isAr ? 'محجوز مؤقتاً' : 'On hold',
    confirmed: isAr ? 'مؤكد' : 'Confirmed',
    checked_in: isAr ? 'تم الدخول' : 'Checked in',
    completed: isAr ? 'مكتمل' : 'Completed',
    cancelled: isAr ? 'ملغي' : 'Cancelled',
    rejected: isAr ? 'مرفوض' : 'Rejected',
    expired: isAr ? 'منتهي' : 'Expired',
    no_show: isAr ? 'لم يحضر' : 'No-show',
  };
  const paymentStatus: Record<string, string> = {
    unpaid: isAr ? 'غير مدفوع' : 'Unpaid',
    pending: isAr ? 'قيد الدفع' : 'Pending',
    paid: isAr ? 'مدفوع' : 'Paid',
    partially_paid: isAr ? 'مدفوع جزئياً' : 'Partially paid',
    refunded: isAr ? 'مسترد' : 'Refunded',
    partially_refunded: isAr ? 'مسترد جزئياً' : 'Partially refunded',
    failed: isAr ? 'فشل الدفع' : 'Failed',
  };
  const ticketStatus: Record<string, string> = {
    open: isAr ? 'مفتوحة' : 'Open',
    in_progress: isAr ? 'قيد المعالجة' : 'In progress',
    resolved: isAr ? 'تم الحل' : 'Resolved',
    closed: isAr ? 'مغلقة' : 'Closed',
  };
  const licenseStatus: Record<string, string> = {
    pending: isAr ? 'قيد المراجعة' : 'Pending',
    active: isAr ? 'معتمد' : 'Approved',
    rejected: isAr ? 'مرفوض' : 'Rejected',
    expired: isAr ? 'منتهي' : 'Expired',
  };
  const payoutStatus: Record<string, string> = {
    upcoming: isAr ? 'قادم' : 'Upcoming',
    processing: isAr ? 'قيد التحويل' : 'Processing',
    executed: isAr ? 'تم التحويل' : 'Paid',
    failed: isAr ? 'فشل' : 'Failed',
  };
  const priorityLabel: Record<string, string> = {
    low: isAr ? 'منخفضة' : 'Low',
    medium: isAr ? 'متوسطة' : 'Medium',
    high: isAr ? 'عالية' : 'High',
    urgent: isAr ? 'عاجلة' : 'Urgent',
  };

  const day = (value: string | null | undefined) =>
    (value ? new Date(value).toLocaleDateString(isAr ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB') : '—');
  const time = (value: string) =>
    new Date(value).toLocaleString(isAr ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
  const money = (value: number) =>
    `${(value || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isAr ? 'ر.س' : 'SAR'}`;

  const askReason = () =>
    (window.prompt(isAr ? 'سبب الرفض (يظهر للمضيف):' : 'Reason for rejection (shown to the host):') || '').trim();

  const moderateProperty = async (property: HostDetail['properties'][number], action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = askReason();
      if (!reason) return;
    } else if (!window.confirm(isAr ? `اعتماد العقار "${property.title}"؟` : `Approve "${property.title}"?`)) {
      return;
    }
    setBusy(property.id);
    try {
      await adminApi.managerModerateProperty(property.id, action === 'reject' ? { action, reason } : { action });
      toast.success(action === 'approve' ? (isAr ? 'تم الاعتماد' : 'Approved') : (isAr ? 'تم الرفض' : 'Rejected'));
      await load(true);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setBusy(null);
    }
  };

  const reviewLicense = async (license: HostDetail['licenses'][number], action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = askReason();
      if (!reason) return;
    } else if (!window.confirm(isAr ? `اعتماد تصريح الوحدة "${license.unitName}"؟` : `Approve the permit for "${license.unitName}"?`)) {
      return;
    }
    setBusy(license.unitId);
    try {
      await adminApi.managerReviewLicense(license.unitId, { action, reason });
      toast.success(action === 'approve' ? (isAr ? 'تم الاعتماد' : 'Approved') : (isAr ? 'تم الرفض' : 'Rejected'));
      await load(true);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setBusy(null);
    }
  };

  const toggleTicket = async (ticketId: string) => {
    if (openTicketId === ticketId) {
      setOpenTicketId(null);
      setThread(null);
      return;
    }
    setOpenTicketId(ticketId);
    setThread(null);
    setReply('');
    setThreadLoading(true);
    try {
      const res = await adminApi.managerTicket(ticketId);
      setThread(res.data.data || null);
    } catch (error: unknown) {
      setOpenTicketId(null);
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحميل التذكرة' : 'Could not load the ticket'));
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    const message = reply.trim();
    if (!thread || !message) return;
    setBusy(thread.id);
    try {
      const res = await adminApi.managerReplyTicket(thread.id, message);
      setThread(res.data.data || thread);
      setReply('');
      toast.success(isAr ? 'تم إرسال الرد' : 'Reply sent');
      await load(true);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر إرسال الرد' : 'Could not send the reply'));
    } finally {
      setBusy(null);
    }
  };

  const setTicketStatus = async (status: TicketStatus) => {
    if (!thread || status === thread.status) return;
    setBusy(thread.id);
    try {
      const res = await adminApi.managerSetTicketStatus(thread.id, status);
      setThread(res.data.data || thread);
      toast.success(isAr ? 'تم تحديث حالة التذكرة' : 'Ticket status updated');
      await load(true);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (isAr ? 'تعذّر تحديث الحالة' : 'Could not update the status'));
    } finally {
      setBusy(null);
    }
  };

  const th = { textAlign: 'start' as const, padding: '12px 16px', fontWeight: 600, color: '#475569' };
  const td = { padding: '12px 16px', color: '#1e293b', verticalAlign: 'top' as const };
  const ltr = { direction: 'ltr' as const, textAlign: 'start' as const };
  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' };
  const tableWrap = { ...card, overflowX: 'auto' as const };
  const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 };
  const headRow = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
  const row = { borderBottom: '1px solid #f1f5f9' };
  const empty = { ...card, textAlign: 'center' as const, padding: 28, color: '#94a3b8', fontSize: 13 };
  const sectionTitle = { fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '28px 0 12px' };
  const approveBtn = { padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: 13, marginInlineEnd: 8 };
  const rejectBtn = { padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: 13 };
  const pill = (color: string, bg: string) => ({ display: 'inline-block', fontSize: 12, padding: '2px 10px', borderRadius: 999, color, background: bg, whiteSpace: 'nowrap' as const });

  const back = (
    <Link href="/admin/my-hosts" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>
      {isAr ? '→ العودة إلى مضيفيّ' : '← Back to My Hosts'}
    </Link>
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  if (!data) {
    return (
      <div>
        {back}
        <div style={empty}>{isAr ? 'تعذّر عرض هذا المضيف' : 'This host could not be shown'}</div>
      </div>
    );
  }

  const { host, properties, licenses, bookings, tickets, finance } = data;

  return (
    <div>
      {back}

      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>{host.name || '—'}</h1>
          {host.isSuspended ? <span style={pill('#dc2626', '#fef2f2')}>{isAr ? 'موقوف' : 'Suspended'}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 10, fontSize: 14, color: '#475569' }}>
          <span>{isAr ? 'الجوال: ' : 'Phone: '}<span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{host.phone || '—'}</span></span>
          <span>{isAr ? 'البريد: ' : 'Email: '}<span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{host.email || '—'}</span></span>
          <span>{isAr ? 'تاريخ الانضمام: ' : 'Joined: '}{day(host.joinedAt)}</span>
        </div>
      </div>

      {/* Properties */}
      <h2 style={sectionTitle}>{isAr ? 'العقارات' : 'Properties'} ({properties.length})</h2>
      {properties.length === 0 ? (
        <div style={empty}>{isAr ? 'لا توجد عقارات' : 'No properties'}</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={headRow}>
                <th style={th}>{isAr ? 'العقار' : 'Property'}</th>
                <th style={th}>{isAr ? 'المدينة' : 'City'}</th>
                <th style={th}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={th}>{isAr ? 'أُضيف في' : 'Added'}</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} style={row}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{property.title || '—'}</div>
                    <div style={{ color: '#64748b' }}>{property.type}</div>
                  </td>
                  <td style={td}>{property.city || '—'}</td>
                  <td style={td}>
                    {property.isApproved
                      ? <span style={pill('#16a34a', '#f0fdf4')}>{isAr ? 'معتمد' : 'Approved'}</span>
                      : <span style={pill('#d97706', '#fffbeb')}>{isAr ? 'بانتظار الاعتماد' : 'Awaiting approval'}</span>}
                    {!property.isActive ? (
                      <span style={{ ...pill('#6b7280', '#f3f4f6'), marginInlineStart: 6 }}>{isAr ? 'غير نشط' : 'Inactive'}</span>
                    ) : null}
                    {property.moderationNote ? (
                      <div style={{ color: '#dc2626', marginTop: 6, maxWidth: 260 }}>{property.moderationNote}</div>
                    ) : null}
                  </td>
                  <td style={td}>{day(property.createdAt)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {!property.isApproved ? (
                      <>
                        <button onClick={() => moderateProperty(property, 'approve')} disabled={busy === property.id} style={approveBtn}>
                          {isAr ? 'اعتماد' : 'Approve'}
                        </button>
                        <button onClick={() => moderateProperty(property, 'reject')} disabled={busy === property.id} style={rejectBtn}>
                          {isAr ? 'رفض' : 'Reject'}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tourism permits */}
      <h2 style={sectionTitle}>{isAr ? 'تصاريح السياحة' : 'Tourism Permits'} ({licenses.length})</h2>
      {licenses.length === 0 ? (
        <div style={empty}>{isAr ? 'لم يرسل المضيف أي تصريح' : 'The host has not submitted any permit'}</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={headRow}>
                <th style={th}>{isAr ? 'الوحدة' : 'Unit'}</th>
                <th style={th}>{isAr ? 'رقم التصريح' : 'Permit no.'}</th>
                <th style={th}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={th}>{isAr ? 'الانتهاء' : 'Expiry'}</th>
                <th style={th}>{isAr ? 'المستند' : 'Document'}</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license.unitId} style={row}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{license.propertyName || '—'}</div>
                    <div style={{ color: '#64748b' }}>{license.unitName}</div>
                  </td>
                  <td style={{ ...td, ...ltr }}>{license.licenseNumber || '—'}</td>
                  <td style={td}>
                    <span style={
                      license.status === 'active' ? pill('#16a34a', '#f0fdf4')
                        : license.status === 'pending' ? pill('#d97706', '#fffbeb')
                          : license.status === 'rejected' ? pill('#dc2626', '#fef2f2')
                            : pill('#6b7280', '#f3f4f6')
                    }>
                      {licenseStatus[license.status] || license.status}
                    </span>
                    {license.status === 'rejected' && license.rejectionReason ? (
                      <div style={{ color: '#dc2626', marginTop: 6, maxWidth: 260 }}>{license.rejectionReason}</div>
                    ) : null}
                  </td>
                  <td style={td}>{day(license.expiryDate)}</td>
                  <td style={td}>
                    {license.documentUrl ? (
                      <a href={license.documentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                        {isAr ? 'عرض' : 'View'}
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {license.status === 'pending' ? (
                      <>
                        <button onClick={() => reviewLicense(license, 'approve')} disabled={busy === license.unitId} style={approveBtn}>
                          {isAr ? 'اعتماد' : 'Approve'}
                        </button>
                        <button onClick={() => reviewLicense(license, 'reject')} disabled={busy === license.unitId} style={rejectBtn}>
                          {isAr ? 'رفض' : 'Reject'}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bookings */}
      <h2 style={sectionTitle}>{isAr ? 'الحجوزات' : 'Bookings'} ({bookings.length})</h2>
      {bookings.length === 0 ? (
        <div style={empty}>{isAr ? 'لا توجد حجوزات' : 'No bookings'}</div>
      ) : (
        <div style={{ ...tableWrap, maxHeight: 460, overflowY: 'auto' }}>
          <table style={table}>
            <thead>
              <tr style={headRow}>
                <th style={th}>{isAr ? 'المرجع' : 'Reference'}</th>
                <th style={th}>{isAr ? 'العقار' : 'Property'}</th>
                <th style={th}>{isAr ? 'الضيف' : 'Guest'}</th>
                <th style={th}>{isAr ? 'الدخول' : 'Check-in'}</th>
                <th style={th}>{isAr ? 'الخروج' : 'Check-out'}</th>
                <th style={th}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={th}>{isAr ? 'الدفع' : 'Payment'}</th>
                <th style={th}>{isAr ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} style={row}>
                  <td style={{ ...td, ...ltr, whiteSpace: 'nowrap' }}>{booking.reference || '—'}</td>
                  <td style={td}>{booking.propertyName || '—'}</td>
                  <td style={td}>{booking.guestName || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{day(booking.checkIn)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{day(booking.checkOut)}</td>
                  <td style={td}>{bookingStatus[booking.status] || booking.status}</td>
                  <td style={td}>{paymentStatus[booking.paymentStatus] || booking.paymentStatus}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{money(booking.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Finance */}
      <h2 style={sectionTitle}>{isAr ? 'المالية' : 'Finance'}</h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '-6px 0 12px' }}>
        {isAr ? 'للعرض فقط — لا يمكن تعديل البيانات المالية من هنا' : 'View only — financial data cannot be changed from here'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          { label: isAr ? 'قيمة الحجوزات' : 'Bookings value', value: money(finance.bookingsValue) },
          { label: isAr ? 'عدد الحجوزات' : 'Bookings count', value: (finance.bookingsCount || 0).toLocaleString('en') },
          { label: isAr ? 'المحوّل للمضيف' : 'Paid out to host', value: money(finance.paidOut) },
        ].map((item) => (
          <div key={item.label} style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{item.value}</div>
          </div>
        ))}
      </div>
      {finance.payouts.length === 0 ? (
        <div style={empty}>{isAr ? 'لا توجد تحويلات' : 'No payouts'}</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={headRow}>
                <th style={th}>{isAr ? 'رقم التحويل' : 'Payout no.'}</th>
                <th style={th}>{isAr ? 'المبلغ' : 'Amount'}</th>
                <th style={th}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={th}>{isAr ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {finance.payouts.map((payout) => (
                <tr key={payout.id} style={row}>
                  <td style={{ ...td, ...ltr }}>{payout.number || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{money(payout.amount)}</td>
                  <td style={td}>{payoutStatus[payout.status] || payout.status}</td>
                  <td style={td}>{day(payout.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Support tickets */}
      <h2 style={sectionTitle}>{isAr ? 'تذاكر الدعم' : 'Support Tickets'} ({tickets.length})</h2>
      {tickets.length === 0 ? (
        <div style={empty}>{isAr ? 'لا توجد تذاكر' : 'No tickets'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tickets.map((ticket) => {
            const isOpen = openTicketId === ticket.id;
            return (
              <div key={ticket.id} style={card}>
                <button
                  onClick={() => toggleTicket(ticket.id)}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', width: '100%', padding: '14px 16px',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'start', fontSize: 13, color: '#1e293b',
                  }}
                >
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 160 }}>{ticket.subject || '—'}</span>
                  <span style={
                    ticket.status === 'open' ? pill('#d97706', '#fffbeb')
                      : ticket.status === 'in_progress' ? pill('#2563eb', '#eff6ff')
                        : ticket.status === 'resolved' ? pill('#16a34a', '#f0fdf4')
                          : pill('#6b7280', '#f3f4f6')
                  }>
                    {ticketStatus[ticket.status] || ticket.status}
                  </span>
                  <span style={{ color: '#64748b' }}>{priorityLabel[ticket.priority] || ticket.priority}</span>
                  <span style={{ color: '#64748b' }}>{day(ticket.updatedAt)}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 500 }}>{isOpen ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'فتح' : 'Open')}</span>
                </button>

                {isOpen ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: 16 }}>
                    {threadLoading || !thread ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
                          {thread.messages.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>{isAr ? 'لا توجد رسائل' : 'No messages'}</div>
                          ) : thread.messages.map((message) => (
                            <div key={message.id} style={{
                              alignSelf: message.fromHost ? 'flex-start' : 'flex-end', maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                              background: message.fromHost ? '#f1f5f9' : '#eff6ff', border: `1px solid ${message.fromHost ? '#e2e8f0' : '#bfdbfe'}`,
                            }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                {message.fromHost ? (isAr ? 'المضيف' : 'Host') : (isAr ? 'فريق هوستن' : 'Hostn team')} · {time(message.createdAt)}
                              </div>
                              <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
                            </div>
                          ))}
                        </div>

                        {thread.status === 'closed' ? (
                          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                            {isAr ? 'التذكرة مغلقة. أعد فتحها من القائمة لتتمكن من الرد.' : 'This ticket is closed. Reopen it from the status menu to reply.'}
                          </div>
                        ) : null}
                        <textarea
                          disabled={thread.status === 'closed'}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          rows={3}
                          placeholder={isAr ? 'اكتب ردّك على المضيف...' : 'Write your reply to the host...'}
                          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                          <button onClick={sendReply} disabled={busy === thread.id || !reply.trim()} style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13,
                            cursor: busy === thread.id || !reply.trim() ? 'not-allowed' : 'pointer', opacity: busy === thread.id || !reply.trim() ? 0.6 : 1,
                          }}>
                            {isAr ? 'إرسال الرد' : 'Send reply'}
                          </button>
                          <label style={{ fontSize: 13, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 8, marginInlineStart: 'auto' }}>
                            {isAr ? 'حالة التذكرة' : 'Ticket status'}
                            <select
                              value={thread.status}
                              disabled={busy === thread.id}
                              onChange={(e) => setTicketStatus(e.target.value as TicketStatus)}
                              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}
                            >
                              {TICKET_STATUSES.map((s) => <option key={s} value={s}>{ticketStatus[s]}</option>)}
                            </select>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
