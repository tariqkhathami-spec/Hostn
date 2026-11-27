'use client';

import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, Loader2, PlugZap } from 'lucide-react';
import { aiApi, AiPublicSettings } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/lib/usePageTitle';
import AiChat from '@/components/ai/AiChat';

type Usage = { conversations: number; turns: number; inputTokens: number; outputTokens: number };
type Overview = {
  settings: AiPublicSettings;
  last24h: Usage;
  last7d: Usage;
  conversationsByRole7d: Record<string, number>;
  actionsByStatus7d: Record<string, number>;
};

const PROVIDER_LABEL: Record<string, string> = { anthropic: 'Anthropic (Claude)', openai_compatible: 'OpenAI-compatible' };

export default function AdminAiPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'المساعد الذكي' : 'AI Assistant');
  const { user } = useAuth();
  const isSuper = !user?.adminRole || user.adminRole === 'super';
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    aiApi.adminOverview()
      .then((r) => setData(r.data.data))
      .catch(() => setLoadError(isAr ? 'تعذّر تحميل إعدادات المساعد' : 'Could not load assistant settings'));
  }, [isAr]);

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const r = await aiApi.adminTest();
      setTest({ ok: true, text: r.data.message || `${r.data.data.model} · ${r.data.data.ms}ms` });
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTest({ ok: false, text: m || (isAr ? 'فشل الاتصال' : 'Connection failed') });
    } finally {
      setTesting(false);
    }
  };

  const s = data?.settings;
  const fmt = (n: number) => n.toLocaleString(isAr ? 'ar-SA' : 'en-US');
  const missingLabel: Record<string, string> = isAr
    ? { apiKey: 'مفتاح المودل', model: 'اسم المودل', baseUrl: 'رابط المزوّد' }
    : { apiKey: 'API key', model: 'model', baseUrl: 'provider base URL' };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? 'المساعد الذكي' : 'AI Assistant'}</h1>
          <p className="text-sm text-gray-500">
            {isAr ? 'يساعد الإدارة في الحجوزات والشكاوي، ويساعد الضيوف والملاك من لوحاتهم. أي تغيير يحتاج تأكيد.' : 'Helps admins with bookings and complaints, and guests and hosts from their dashboards. Every change needs confirmation.'}
          </p>
        </div>
      </div>

      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {s && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{isAr ? 'ربط المودل' : 'Model connection'}</h2>
              {s.enabled
                ? <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'مفعّل' : 'On'}</span>
                : <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3.5 h-3.5" />{isAr ? 'غير مفعّل' : 'Off'}</span>}
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'المزوّد' : 'Provider'}</dt><dd className="font-medium" dir="ltr">{PROVIDER_LABEL[s.provider] || s.provider}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'المودل' : 'Model'}</dt><dd className="font-medium" dir="ltr">{s.model || '—'}</dd></div>
              {s.baseUrl && <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'الرابط' : 'Base URL'}</dt><dd className="font-medium truncate" dir="ltr">{s.baseUrl}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'المفتاح' : 'API key'}</dt><dd className="font-medium">{s.hasApiKey ? (isAr ? 'موجود' : 'Set') : (isAr ? 'غير موجود' : 'Missing')}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'متاح لـ' : 'Available to'}</dt><dd className="font-medium">{(['admin', 'host', 'guest'] as const).filter((r) => s.roles?.[r]).map((r) => ({ admin: isAr ? 'الإدارة' : 'Admins', host: isAr ? 'الملاك' : 'Hosts', guest: isAr ? 'الضيوف' : 'Guests' })[r]).join(isAr ? '، ' : ', ') || '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-500">{isAr ? 'الحد لكل مستخدم' : 'Per-user limit'}</dt><dd className="font-medium">{isAr ? `${s.ratePerMinute} بالدقيقة · ${s.dailyLimit} باليوم` : `${s.ratePerMinute}/min · ${s.dailyLimit}/day`}</dd></div>
            </dl>
            {!s.enabled && s.missing.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
                {isAr ? 'ناقص: ' : 'Missing: '}{s.missing.map((m) => missingLabel[m] || m).join(isAr ? '، ' : ', ')}.{' '}
                {isAr ? 'أضفه من صفحة المفاتيح والربط أو متغيرات البيئة في السيرفر.' : 'Add it on the integration keys page or in the server environment.'}
              </p>
            )}
            <p className="text-xs text-gray-500">{isAr ? 'المفتاح والمودل وتشغيل المساعد للضيوف والملاك من صفحة المفاتيح والربط.' : 'Key, model and guest/host access are set on the integration keys page.'}</p>
            {s.switchedOff && <p className="text-xs text-gray-600">{isAr ? 'المساعد مطفأ يدوياً (AI_ENABLED=false).' : 'Switched off (AI_ENABLED=false).'}</p>}
            {isSuper && <button onClick={runTest} disabled={!s.enabled || testing}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
              {isAr ? 'اختبار الاتصال' : 'Test connection'}
            </button>}
            {test && <p className={`text-xs ${test.ok ? 'text-green-700' : 'text-red-600'}`} dir="auto">{test.text}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4">{isAr ? 'الاستخدام' : 'Usage'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: isAr ? 'محادثات (٢٤ ساعة)' : 'Chats (24h)', value: data.last24h.conversations },
                { label: isAr ? 'رسائل (٢٤ ساعة)' : 'Messages (24h)', value: data.last24h.turns },
                { label: isAr ? 'محادثات (٧ أيام)' : 'Chats (7d)', value: data.last7d.conversations },
                { label: isAr ? 'توكنز (٧ أيام)' : 'Tokens (7d)', value: data.last7d.inputTokens + data.last7d.outputTokens },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xl font-bold text-gray-900">{fmt(x.value)}</div>
                  <div className="text-xs text-gray-500 mt-1">{x.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500 mb-1">{isAr ? 'المحادثات حسب الدور (٧ أيام)' : 'Chats by role (7d)'}</div>
                <div className="flex gap-3">
                  {(['admin', 'host', 'guest'] as const).map((r) => (
                    <span key={r}>{({ admin: isAr ? 'إدارة' : 'Admin', host: isAr ? 'ملاك' : 'Hosts', guest: isAr ? 'ضيوف' : 'Guests' })[r]}: <b>{fmt(data.conversationsByRole7d[r] || 0)}</b></span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">{isAr ? 'الإجراءات المقترحة (٧ أيام)' : 'Proposed actions (7d)'}</div>
                <div className="flex gap-3 flex-wrap">
                  <span>{isAr ? 'نُفّذت' : 'Done'}: <b>{fmt(data.actionsByStatus7d.executed || 0)}</b></span>
                  <span>{isAr ? 'رُفضت' : 'Rejected'}: <b>{fmt(data.actionsByStatus7d.rejected || 0)}</b></span>
                  <span>{isAr ? 'معلّقة' : 'Pending'}: <b>{fmt(data.actionsByStatus7d.pending || 0)}</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {s?.enabled && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-900">{isAr ? 'اسأل المساعد' : 'Ask the assistant'}</div>
          <AiChat role="admin" className="h-[560px]" />
        </div>
      )}
    </div>
  );
}
