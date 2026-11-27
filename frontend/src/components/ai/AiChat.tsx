'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Check, X, Loader2, Plus } from 'lucide-react';
import { aiApi, AiAction, AiChatMessage } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type Role = 'guest' | 'host' | 'admin';

const SUGGESTIONS: Record<Role, { ar: string; en: string }[]> = {
  admin: [
    { ar: 'لخص لي الشكاوي المفتوحة ورتبها حسب الأهمية', en: 'Summarize open complaints by priority' },
    { ar: 'كيف أداء المنصة آخر ٧ أيام؟', en: 'How did the platform do in the last 7 days?' },
    { ar: 'وش الحجوزات اللي تبدأ هالأسبوع وما انقبضت؟', en: 'Unpaid bookings starting this week?' },
  ],
  host: [
    { ar: 'وش حجوزاتي القادمة؟', en: 'What are my upcoming bookings?' },
    { ar: 'كم أرباحي آخر ٣٠ يوم؟', en: 'My earnings in the last 30 days?' },
    { ar: 'اقترح علي طرق أحسّن فيها إعلاناتي', en: 'How can I improve my listings?' },
  ],
  guest: [
    { ar: 'وش حجوزاتي القادمة؟', en: 'What are my upcoming bookings?' },
    { ar: 'لو ألغيت حجزي الحين، يرجع لي العربون؟', en: 'If I cancel now, is my deposit refunded?' },
    { ar: 'عندي مشكلة وأبي أفتح شكوى', en: 'I have a problem and want to file a complaint' },
  ],
};

const ACTION_STATUS: Record<AiAction['status'], { ar: string; en: string; cls: string }> = {
  pending: { ar: 'بانتظار تأكيدك', en: 'Waiting for your confirmation', cls: 'bg-amber-50 text-amber-700' },
  executed: { ar: 'تم التنفيذ', en: 'Done', cls: 'bg-green-50 text-green-700' },
  rejected: { ar: 'تم الإلغاء', en: 'Cancelled', cls: 'bg-gray-100 text-gray-600' },
  failed: { ar: 'لم يُنفّذ', en: 'Failed', cls: 'bg-red-50 text-red-700' },
  expired: { ar: 'انتهت صلاحيته', en: 'Expired', cls: 'bg-gray-100 text-gray-600' },
};

/** Minimal formatting: **bold** and line breaks. No HTML from the model is rendered. */
function Formatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}
    </span>
  );
}

type Entry = { kind: 'msg'; msg: AiChatMessage } | { kind: 'action'; action: AiAction };

export default function AiChat({ role, className = '' }: { role: Role; className?: string }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setError('');
    setInput('');
    setEntries((e) => [...e, { kind: 'msg', msg: { role: 'user', text: message } }]);
    setSending(true);
    try {
      const res = await aiApi.chat(message, conversationId);
      const d = res.data.data;
      setConversationId(d.conversationId);
      setEntries((e) => [
        ...e,
        { kind: 'msg', msg: { role: 'assistant', text: d.reply } },
        ...d.actions.map((a) => ({ kind: 'action' as const, action: a })),
      ]);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
      if (m?.code === 'AI_CONVERSATION_FULL') setConversationId(null);
      setError(m?.message || (isAr ? 'تعذّر الاتصال بالمساعد' : 'Could not reach the assistant'));
    } finally {
      setSending(false);
    }
  };

  const decide = async (id: string, approve: boolean) => {
    setBusyAction(id);
    try {
      const res = approve ? await aiApi.confirmAction(id) : await aiApi.rejectAction(id);
      const updated = res.data.data;
      setEntries((e) => e.map((x) => (x.kind === 'action' && x.action.id === id ? { kind: 'action', action: updated } : x)));
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { data?: AiAction; message?: string } } })?.response?.data;
      if (r?.data) setEntries((e) => e.map((x) => (x.kind === 'action' && x.action.id === id ? { kind: 'action', action: r.data as AiAction } : x)));
      else setError(r?.message || (isAr ? 'تعذّر تنفيذ الإجراء' : 'Could not complete the action'));
    } finally {
      setBusyAction(null);
    }
  };

  const reset = () => { setEntries([]); setConversationId(null); setError(''); };

  return (
    <div className={`flex flex-col min-h-0 ${className}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {entries.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {isAr ? 'اسألني عن حجوزاتك أو أي شي في هوستن. أي تغيير ما أنفذه إلا بعد ما تأكد.' : 'Ask me about your bookings or anything on Hostn. I never change anything until you confirm.'}
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS[role].map((s) => (
                <button key={s.en} onClick={() => send(isAr ? s.ar : s.en)}
                  className="text-start text-sm px-3 py-2 rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition">
                  {isAr ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((e, i) => (e.kind === 'msg' ? (
          <div key={i} className={`flex ${e.msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${e.msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
              <Formatted text={e.msg.text} />
            </div>
          </div>
        ) : (
          <div key={i} className="rounded-xl border border-amber-200 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-medium text-gray-900">{isAr ? 'إجراء مقترح' : 'Proposed action'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_STATUS[e.action.status].cls}`}>
                {isAr ? ACTION_STATUS[e.action.status].ar : ACTION_STATUS[e.action.status].en}
              </span>
            </div>
            <div className="text-gray-700"><Formatted text={e.action.summary} /></div>
            {e.action.error && <p className="mt-2 text-xs text-red-600">{e.action.error}</p>}
            {e.action.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button disabled={busyAction === e.action.id} onClick={() => decide(e.action.id, true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs disabled:opacity-50">
                  {busyAction === e.action.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {isAr ? 'تأكيد' : 'Confirm'}
                </button>
                <button disabled={busyAction === e.action.id} onClick={() => decide(e.action.id, false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs disabled:opacity-50">
                  <X className="w-3.5 h-3.5" />
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        )))}

        {sending && (
          <div className="flex justify-end">
            <div className="bg-gray-100 rounded-2xl px-3.5 py-2.5 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />{isAr ? 'أشيك...' : 'Checking...'}
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(ev) => { ev.preventDefault(); send(input); }} className="border-t border-gray-200 p-3 flex items-end gap-2">
        {entries.length > 0 && (
          <button type="button" onClick={reset} title={isAr ? 'محادثة جديدة' : 'New chat'}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><Plus className="w-5 h-5" /></button>
        )}
        <textarea
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(input); } }}
          rows={1}
          maxLength={2000}
          placeholder={isAr ? 'اكتب سؤالك...' : 'Type your question...'}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500 max-h-32"
        />
        <button type="submit" disabled={sending || !input.trim()} aria-label={isAr ? 'إرسال' : 'Send'}
          className="p-2.5 rounded-xl bg-primary-600 text-white disabled:opacity-40">
          <Send className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
}
