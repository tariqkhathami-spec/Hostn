'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter, useParams } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { SupportTicket } from '@/types';
import { ArrowLeft, Send, Clock, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const statusConfig: Record<string, { label: { en: string; ar: string }; color: string; icon: JSX.Element }> = {
  open: { label: { en: 'Open', ar: 'مفتوحة' }, color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: { en: 'In Progress', ar: 'قيد المعالجة' }, color: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  resolved: { label: { en: 'Resolved', ar: 'تم الحل' }, color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  closed: { label: { en: 'Closed', ar: 'مغلقة' }, color: 'bg-gray-100 text-gray-600', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  booking: { en: 'Booking', ar: 'حجز' },
  payment: { en: 'Payment', ar: 'دفع' },
  property: { en: 'Property', ar: 'عقار' },
  account: { en: 'Account', ar: 'حساب' },
  technical: { en: 'Technical', ar: 'تقني' },
  other: { en: 'Other', ar: 'أخرى' },
};

const priorityLabels: Record<string, { en: string; ar: string }> = {
  low: { en: 'Low', ar: 'منخفضة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  high: { en: 'High', ar: 'عالية' },
  urgent: { en: 'Urgent', ar: 'عاجلة' },
};

export default function TicketDetailPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && id) loadTicket();
  }, [isAuthenticated, id]);

  const loadTicket = async () => {
    try {
      const res = await supportApi.getTicket(id);
      setTicket(res.data.data);
    } catch {
      toast.error(isAr ? 'فشل تحميل التذكرة' : 'Failed to load ticket');
      router.push('/dashboard/support');
    } finally { setLoading(false); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages]);

  const handleReply = async () => {
    if (!reply.trim() || sending) return;
    const content = reply.trim();
    setSending(true);

    // Optimistic: add message to UI immediately
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      content,
      sender: user?._id || '',
      senderRole: 'user' as const,
      createdAt: new Date().toISOString(),
    };
    setTicket(prev => prev ? { ...prev, messages: [...(prev.messages || []), optimisticMsg] } : prev);
    setReply('');

    try {
      await supportApi.replyToTicket(id, { content });
      // Reload to get server truth
      loadTicket();
    } catch {
      // Vercel proxy may throw even on success — don't revert, just reload
      loadTicket();
    } finally { setSending(false); }
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8"><div className="text-center py-16 text-gray-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</div></main>
    </div>
  );

  if (!ticket) return null;

  const sc = statusConfig[ticket.status] || statusConfig.open;
  const canReply = ticket.status !== 'closed';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard/support" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {isAr ? 'العودة للتذاكر' : 'Back to tickets'}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
              {sc.icon} {isAr ? sc.label.ar : sc.label.en}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{isAr ? 'الفئة' : 'Category'}: <span className="text-gray-600 capitalize">{(isAr ? categoryLabels[ticket.category]?.ar : categoryLabels[ticket.category]?.en) || ticket.category}</span></span>
            <span>{isAr ? 'الأولوية' : 'Priority'}: <span className="text-gray-600 capitalize">{(isAr ? priorityLabels[ticket.priority]?.ar : priorityLabels[ticket.priority]?.en) || ticket.priority}</span></span>
            <span>{isAr ? 'تاريخ الإنشاء' : 'Created'}: {new Date(ticket.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : undefined)}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {ticket.messages?.map((msg, i) => {
              const isAdmin = msg.senderRole === 'admin';
              const senderName = typeof msg.sender === 'object' ? (msg.sender as { name?: string }).name : (isAr ? 'مستخدم' : 'User');
              return (
                <div key={msg._id || i} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] ${isAdmin ? 'order-1' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isAdmin && <Shield className="w-3.5 h-3.5 text-primary-500" />}
                      <span className="text-xs font-medium text-gray-500">{isAdmin ? (isAr ? 'فريق الدعم' : 'Support Team') : senderName}</span>
                      <span className="text-xs text-gray-300">{new Date(msg.createdAt).toLocaleString(isAr ? 'ar-u-nu-latn' : 'en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${isAdmin ? 'bg-primary-50 border border-primary-100 text-gray-800 rounded-bl-md' : 'bg-gray-100 text-gray-800 rounded-br-md'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply */}
          {canReply ? (
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-end gap-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)}
                  placeholder={isAr ? 'اكتب ردك...' : 'Type your reply...'} rows={2}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }} />
                <button onClick={handleReply} disabled={!reply.trim() || sending}
                  className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition">
                  <Send className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-400">
              {isAr ? 'هذه التذكرة مغلقة. أنشئ تذكرة جديدة إذا كنت بحاجة لمزيد من المساعدة.' : 'This ticket is closed. Create a new ticket if you need more help.'}
            </div>
          )}
        </div>
    </div>
  );
}
