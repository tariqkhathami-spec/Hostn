'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { SupportTicket } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';

const statusOptions = ['open', 'in_progress', 'resolved', 'closed'];

const getStatusLabels = (isAr: boolean): Record<string, string> => ({
  open: isAr ? 'مفتوح' : 'Open',
  in_progress: isAr ? 'قيد المعالجة' : 'In progress',
  resolved: isAr ? 'تم الحل' : 'Resolved',
  closed: isAr ? 'مغلق' : 'Closed',
});

export default function AdminTicketDetailPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'تذكرة الدعم' : 'Support Ticket');
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const statusLabels = getStatusLabels(isAr);

  useEffect(() => { if (id) loadTicket(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages]);

  const loadTicket = async () => {
    try {
      const res = await supportApi.getTicket(id);
      setTicket(res.data.data);
    } catch {
      toast.error(isAr ? 'فشل في تحميل التذكرة' : 'Failed to load ticket');
      router.push('/admin/support');
    } finally { setLoading(false); }
  };

  const handleReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await supportApi.replyToTicket(id, { content: reply.trim() });
      setReply('');
      loadTicket();
      toast.success(isAr ? 'تم إرسال الرد' : 'Reply sent');
    } catch { toast.error(isAr ? 'فشل في إرسال الرد' : 'Failed to send reply'); }
    finally { setSending(false); }
  };

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      await supportApi.updateTicketStatus(id, status);
      loadTicket();
      toast.success(isAr ? `تم تحديث الحالة إلى ${statusLabels[status]}` : `Status updated to ${status}`);
    } catch { toast.error(isAr ? 'فشل في تحديث الحالة' : 'Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (!ticket) return null;

  const userName = typeof ticket.user === 'object' ? (ticket.user as { name?: string; email?: string }).name : (isAr ? 'غير معروف' : 'Unknown');
  const userEmail = typeof ticket.user === 'object' ? (ticket.user as { email?: string }).email : '';

  return (
    <div>
      <Link href="/admin/support" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        {isAr ? '→ العودة إلى التذاكر' : '← Back to tickets'}
      </Link>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{ticket.subject}</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {isAr ? 'من' : 'From'}: {userName} {userEmail ? `(${userEmail})` : ''} · {isAr ? 'أُنشئت' : 'Created'}: {new Date(ticket.createdAt).toLocaleString(isAr ? 'ar-u-nu-latn' : 'en')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={ticket.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, cursor: 'pointer' }}
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' }}>
            {ticket.category}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize',
            background: ticket.priority === 'high' ? '#fef2f2' : ticket.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
            color: ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#d97706' : '#16a34a',
          }}>
            {ticket.priority === 'high' ? (isAr ? 'أولوية عالية' : 'high priority')
              : ticket.priority === 'medium' ? (isAr ? 'أولوية متوسطة' : 'medium priority')
              : (isAr ? 'أولوية منخفضة' : 'low priority')}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: 16, maxHeight: 500, overflowY: 'auto' }}>
          {ticket.messages?.map((msg, i) => {
            const isAdmin = msg.senderRole === 'admin';
            const senderName = typeof msg.sender === 'object' ? (msg.sender as { name?: string }).name : (isAr ? 'مستخدم' : 'User');
            return (
              <div key={msg._id || i} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                  {isAdmin ? (isAr ? '🛡️ مشرف' : '🛡️ Admin') : senderName} · {new Date(msg.createdAt).toLocaleString(isAr ? 'ar-u-nu-latn' : 'en')}
                </div>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: isAdmin ? '#eff6ff' : '#f8fafc', border: `1px solid ${isAdmin ? '#bfdbfe' : '#e2e8f0'}`,
                  color: '#1e293b',
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply */}
        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={isAr ? 'اكتب رد المشرف...' : 'Type admin reply...'}
            rows={2}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'none' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
          />
          <button onClick={handleReply} disabled={!reply.trim() || sending} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: !reply.trim() || sending ? 0.5 : 1, alignSelf: 'flex-end',
          }}>
            {sending ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'رد' : 'Reply')}
          </button>
        </div>
      </div>
    </div>
  );
}
