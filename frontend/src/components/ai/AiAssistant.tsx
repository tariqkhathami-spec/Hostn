'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import AiChat from './AiChat';

/** Floating assistant button + panel for the guest, host and admin dashboards. */
export default function AiAssistant({ role }: { role: 'guest' | 'host' | 'admin' }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const pathname = usePathname() || '';
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  const isManager = user?.adminRole === 'account_manager';
  // On admin.hostn.co the page is served at /ai (rewritten to /admin/ai).
  const onAiPage = role === 'admin' && /^\/(admin\/)?ai(\/|$)/.test(pathname);

  useEffect(() => {
    if (!user || isManager) return;
    aiApi.status().then((r) => setEnabled(!!r.data.data.enabled)).catch(() => setEnabled(false));
  }, [user, isManager]);

  if (!user || isManager || onAiPage || enabled === null) return null;
  // Customers only see the assistant when it works; admins see it so they can set it up.
  if (!enabled && role !== 'admin') return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-white shadow-lg hover:bg-primary-700"
          aria-label={isAr ? 'مساعد هوستن' : 'Hostn assistant'}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">{isAr ? 'مساعد هوستن' : 'Assistant'}</span>
        </button>
      )}
      {open && (
        <div className="fixed z-50 bottom-0 end-0 sm:bottom-5 sm:end-5 w-full sm:w-[400px] h-[85vh] sm:h-[600px] flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-primary-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">{isAr ? 'مساعد هوستن' : 'Hostn assistant'}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label={isAr ? 'إغلاق' : 'Close'} className="p-1 rounded hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
          {enabled ? (
            <AiChat role={role} className="flex-1" />
          ) : (
            <div className="p-5 text-sm text-gray-700 space-y-3">
              <p>{isAr ? 'المساعد غير مفعّل لأنه ما فيه مفتاح للمودل.' : 'The assistant is off: no model key is set.'}</p>
              <Link href="/admin/ai" className="text-primary-600 underline">{isAr ? 'افتح إعدادات المساعد' : 'Open assistant settings'}</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
