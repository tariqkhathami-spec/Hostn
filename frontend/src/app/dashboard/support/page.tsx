'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { SupportTicket, TicketCategory, TicketPriority } from '@/types';
import { HelpCircle, Plus, Clock, CheckCircle2, AlertCircle, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { usePageTitle } from '@/lib/usePageTitle';

const categoryLabels: Record<TicketCategory, { en: string; ar: string }> = {
  payment: { en: 'Payment Issue', ar: 'مشكلة دفع' },
  booking: { en: 'Booking Issue', ar: 'مشكلة حجز' },
  complaint: { en: 'Complaint', ar: 'شكوى' },
  technical: { en: 'Technical Issue', ar: 'مشكلة تقنية' },
  account: { en: 'Account Issue', ar: 'مشكلة حساب' },
  other: { en: 'Other', ar: 'أخرى' },
};
const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700',
};
const statusIcons: Record<string, JSX.Element> = {
  open: <Clock className="w-4 h-4 text-blue-500" />,
  in_progress: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  resolved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  closed: <CheckCircle2 className="w-4 h-4 text-gray-400" />,
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  all: { en: 'All', ar: 'الكل' },
  open: { en: 'Open', ar: 'مفتوح' },
  in_progress: { en: 'In Progress', ar: 'قيد المعالجة' },
  resolved: { en: 'Resolved', ar: 'تم الحل' },
  closed: { en: 'Closed', ar: 'مغلق' },
};

const priorityLabels: Record<string, { en: string; ar: string }> = {
  low: { en: 'Low', ar: 'منخفض' },
  medium: { en: 'Medium', ar: 'متوسط' },
  high: { en: 'High', ar: 'عالي' },
};

export default function SupportPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'الدعم' : 'Support');
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ subject: '', category: 'technical' as TicketCategory, priority: 'medium' as TicketPriority, message: '' });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/support');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) loadTickets();
  }, [isAuthenticated]);

  const loadTickets = async () => {
    try {
      const res = await supportApi.getMyTickets();
      setTickets(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return toast.error(isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
    setCreating(true);
    try {
      await supportApi.createTicket(form);
      toast.success(isAr ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created successfully');
      setShowForm(false);
      setForm({ subject: '', category: 'technical', priority: 'medium', message: '' });
      loadTickets();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (isAr ? 'فشل إنشاء التذكرة' : 'Failed to create ticket'));
    } finally { setCreating(false); }
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  if (isLoading) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isAr ? 'مركز الدعم' : 'Support Center'}</h1>
            <p className="text-sm text-gray-500 mt-1">{isAr ? 'احصل على مساعدة بشأن حجوزاتك وحسابك' : 'Get help with your bookings and account'}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition text-sm font-medium">
            <Plus className="w-4 h-4" /> {isAr ? 'تذكرة جديدة' : 'New Ticket'}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === s ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {statusLabels[s]?.[isAr ? 'ar' : 'en'] || s}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">{isAr ? 'جاري تحميل التذاكر...' : 'Loading tickets...'}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{isAr ? 'لا توجد تذاكر' : 'No tickets found'}</p>
            <p className="text-sm text-gray-400 mt-1">{isAr ? 'أنشئ تذكرة جديدة إذا كنت بحاجة للمساعدة' : 'Create a new ticket if you need help'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ticket => (
              <Link key={ticket._id} href={`/dashboard/support/${ticket._id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcons[ticket.status]}
                      <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{categoryLabels[ticket.category][isAr ? 'ar' : 'en']}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>{priorityLabels[ticket.priority]?.[isAr ? 'ar' : 'en'] || ticket.priority}</span>
                      <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString('en')}</span>
                      <span className="text-xs text-gray-400">{ticket.messages?.length || 0} {isAr ? 'رسائل' : 'messages'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition rtl:rotate-180" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* New Ticket Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{isAr ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الموضوع' : 'Subject'}</label>
                  <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    placeholder={isAr ? 'وصف مختصر لمشكلتك' : 'Brief description of your issue'} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                      {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v[isAr ? 'ar' : 'en']}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الأولوية' : 'Priority'}</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="low">{isAr ? 'منخفض' : 'Low'}</option>
                      <option value="medium">{isAr ? 'متوسط' : 'Medium'}</option>
                      <option value="high">{isAr ? 'عالي' : 'High'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الرسالة' : 'Message'}</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                    rows={4} placeholder={isAr ? 'صف مشكلتك بالتفصيل...' : 'Describe your issue in detail...'} required />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition">{isAr ? 'إلغاء' : 'Cancel'}</button>
                  <button type="submit" disabled={creating}
                    className="px-4 py-2.5 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition">
                    {creating ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء التذكرة' : 'Create Ticket')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
