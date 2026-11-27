'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { integrationsApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';
import { KeyRound, Lock, ShieldCheck, RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

type Option = { value: string; ar: string; en: string };
interface KeyItem {
  key: string;
  group: string;
  secret: boolean;
  live: boolean;
  type: 'text' | 'multiline' | 'select' | 'boolean';
  options?: Option[];
  allowCustom?: boolean;
  label: { ar: string; en: string };
  hint: string | null;
  source: 'dashboard' | 'env' | 'none';
  value: string | null;
  masked: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  restartNeeded: boolean;
}
interface Group { id: string; ar: string; en: string }
interface Payload {
  store: { enabled: boolean; loadedAt: string | null; lastError: string | null };
  groups: Group[];
  keys: KeyItem[];
  stepUp: { required: boolean; phoneHint: string | null };
}

type ApiError = { response?: { status?: number; data?: { message?: string; code?: string } } };
const errorOf = (e: unknown) => (e as ApiError)?.response?.data;

// The step-up token lives in memory only (never localStorage): a reload asks again.
let stepUpToken: { token: string; expiresAt: number } | null = null;
const validStepUp = () => (stepUpToken && stepUpToken.expiresAt > Date.now() ? stepUpToken.token : null);

export default function IntegrationsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'المفاتيح والربط' : 'Keys & Integrations');

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Step-up dialog
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pending, setPending] = useState<null | (() => Promise<void>)>(null);

  const isSuper = (user?.adminRole || 'super') === 'super';

  const load = useCallback(async () => {
    try {
      const res = await integrationsApi.list();
      setData(res.data.data);
    } catch (e) {
      toast.error(errorOf(e)?.message || (isAr ? 'تعذّر تحميل الإعدادات' : 'Could not load settings'));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { if (isSuper) load(); else setLoading(false); }, [isSuper, load]);

  const grouped = useMemo(() => {
    if (!data) return [];
    return data.groups.map((g) => ({ group: g, keys: data.keys.filter((k) => k.group === g.id) })).filter((g) => g.keys.length);
  }, [data]);

  const replaceItem = (item: KeyItem) => {
    setData((d) => (d ? { ...d, keys: d.keys.map((k) => (k.key === item.key ? item : k)) } : d));
  };

  /** Run a change; on STEP_UP_REQUIRED open the code dialog and retry after it. */
  const withStepUp = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      if (errorOf(e)?.code === 'STEP_UP_REQUIRED') {
        stepUpToken = null;
        setPending(() => action);
        setOtp('');
        setStepUpOpen(true);
        return;
      }
      toast.error(errorOf(e)?.message || (isAr ? 'تعذّر الحفظ' : 'Could not save'));
    }
  };

  const save = (item: KeyItem, rawValue?: string) => withStepUp(async () => {
    const value = (rawValue ?? drafts[item.key] ?? '').trim();
    if (!value) { toast.error(isAr ? 'اكتب القيمة أولًا' : 'Enter a value first'); return; }
    setBusyKey(item.key);
    try {
      const res = await integrationsApi.setKey(item.key, value, validStepUp());
      replaceItem(res.data.data);
      setDrafts((d) => { const n = { ...d }; delete n[item.key]; return n; });
      toast.success(isAr ? 'تم الحفظ' : 'Saved');
    } finally {
      setBusyKey(null);
    }
  });

  const clear = (item: KeyItem) => withStepUp(async () => {
    if (!window.confirm(isAr ? `حذف القيمة المحفوظة لـ ${item.key}؟ سيرجع النظام لقيمة Railway إن وجدت.` : `Remove the saved value of ${item.key}? The Railway value (if any) is used again.`)) return;
    setBusyKey(item.key);
    try {
      const res = await integrationsApi.clearKey(item.key, validStepUp());
      replaceItem(res.data.data);
      toast.success(isAr ? 'تم الحذف' : 'Removed');
    } finally {
      setBusyKey(null);
    }
  });

  const sendCode = async () => {
    setSending(true);
    try {
      const res = await integrationsApi.sendStepUp();
      toast.success(res.data?.message?.startsWith('DEV') ? 'DEV: 0000' : (isAr ? 'تم إرسال الرمز' : 'Code sent'));
    } catch (e) {
      toast.error(errorOf(e)?.message || (isAr ? 'تعذّر إرسال الرمز' : 'Could not send the code'));
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await integrationsApi.verifyStepUp(otp.trim());
      const { stepUpToken: token, expiresIn } = res.data.data;
      stepUpToken = { token, expiresAt: Date.now() + (expiresIn - 15) * 1000 };
      setStepUpOpen(false);
      const action = pending;
      setPending(null);
      if (action) await withStepUp(action);
    } catch (err) {
      toast.error(errorOf(err)?.message || (isAr ? 'رمز غير صحيح' : 'Wrong code'));
    } finally {
      setVerifying(false);
    }
  };

  const testAi = async () => {
    setTesting(true);
    try {
      const res = await integrationsApi.testAi();
      toast.success(res.data.message);
    } catch (e) {
      toast.error(errorOf(e)?.message || (isAr ? 'فشل الاختبار' : 'Test failed'));
    } finally {
      setTesting(false);
    }
  };

  // ── styles (match the rest of the admin dashboard) ──
  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' };
  const input = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', color: '#1e293b', width: '100%', fontFamily: 'inherit' };
  const btn = (primary = false, disabled = false) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const,
    border: primary ? 'none' : '1px solid #e2e8f0', background: primary ? '#4f46e5' : '#fff', color: primary ? '#fff' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  });
  const badge = (bg: string, color: string) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: bg, color, fontWeight: 600 });

  if (!isSuper) {
    return <div style={{ ...card, padding: 24, color: '#64748b' }}>{isAr ? 'هذه الصفحة للمشرف العام فقط.' : 'Super admins only.'}</div>;
  }
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" /></div>;
  }
  if (!data) return null;

  const sourceBadge = (k: KeyItem) => {
    if (k.source === 'dashboard') return <span style={badge('#eef2ff', '#4338ca')}>{isAr ? 'من اللوحة' : 'Dashboard'}</span>;
    if (k.source === 'env') return <span style={badge('#f1f5f9', '#475569')}>{isAr ? 'من Railway' : 'Railway env'}</span>;
    return <span style={badge('#fef2f2', '#b91c1c')}>{isAr ? 'غير مضبوط' : 'Not set'}</span>;
  };

  const renderEditor = (k: KeyItem) => {
    const disabled = !data.store.enabled || busyKey === k.key;
    if (k.type === 'boolean') {
      const on = (k.value ?? '') === 'true' || (k.value == null && k.key === 'AI_ADMIN_ENABLED');
      return (
        <button type="button" disabled={disabled} onClick={() => save(k, on ? 'false' : 'true')} style={btn(!on, disabled)}>
          {on ? (isAr ? 'مفعّل — إيقاف' : 'On — turn off') : (isAr ? 'متوقف — تفعيل' : 'Off — turn on')}
        </button>
      );
    }
    if (k.type === 'select' && k.allowCustom) {
      // Pick a suggested model or type any model name (other providers).
      const listId = `opts-${k.key}`;
      const current = drafts[k.key] ?? k.value ?? '';
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <input list={listId} value={current} onChange={(e) => setDrafts((d) => ({ ...d, [k.key]: e.target.value }))}
            placeholder={k.options?.[0]?.value} style={input} disabled={disabled} dir="ltr" autoComplete="off" spellCheck={false} />
          <datalist id={listId}>
            {k.options?.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
          </datalist>
          <button type="button" disabled={disabled || !current.trim()} onClick={() => save(k, current)} style={btn(true, disabled || !current.trim())}>
            {isAr ? 'حفظ' : 'Save'}
          </button>
        </div>
      );
    }
    if (k.type === 'select') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={drafts[k.key] ?? k.value ?? k.options?.[0]?.value ?? ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [k.key]: e.target.value }))}
            style={input}
            disabled={disabled}
          >
            {k.options?.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
          </select>
          <button type="button" disabled={disabled} onClick={() => save(k, drafts[k.key] ?? k.value ?? k.options?.[0]?.value)} style={btn(true, disabled)}>
            {isAr ? 'حفظ' : 'Save'}
          </button>
        </div>
      );
    }
    const placeholder = k.secret
      ? (k.masked ? (isAr ? `محفوظ ${k.masked} — اكتب قيمة جديدة للتغيير` : `Saved ${k.masked} — type to replace`) : (k.hint || (isAr ? 'الصق المفتاح هنا' : 'Paste the key')))
      : (k.hint || '');
    const common = {
      value: drafts[k.key] ?? (k.secret ? '' : k.value ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDrafts((d) => ({ ...d, [k.key]: e.target.value })),
      placeholder,
      disabled,
      autoComplete: 'off',
      spellCheck: false,
      dir: 'ltr' as const,
    };
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {k.type === 'multiline'
          ? <textarea {...common} rows={k.key === 'AI_EXTRA_INSTRUCTIONS' ? 4 : 3} style={{ ...input, resize: 'vertical', direction: k.key === 'AI_EXTRA_INSTRUCTIONS' ? 'rtl' : 'ltr' }} dir={k.key === 'AI_EXTRA_INSTRUCTIONS' ? 'auto' : 'ltr'} />
          : <input {...common} type={k.secret ? 'password' : 'text'} style={input} />}
        <button type="button" disabled={disabled || !(drafts[k.key] ?? '').trim()} onClick={() => save(k)} style={btn(true, disabled || !(drafts[k.key] ?? '').trim())}>
          {busyKey === k.key ? <Loader2 size={14} className="animate-spin" /> : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={22} /> {isAr ? 'المفاتيح والربط' : 'Keys & Integrations'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr
            ? 'كل مفاتيح الخدمات في مكان واحد. القيم السرية تُحفظ مشفّرة ولا تظهر مرة ثانية، وكل تغيير يحتاج رمز تحقق ويُسجّل في سجل النشاط.'
            : 'All service keys in one place. Secrets are stored encrypted and never shown again; every change needs a code and is logged.'}
        </p>
      </div>

      {!data.store.enabled && (
        <div style={{ ...card, padding: 16, marginBottom: 16, background: '#fffbeb', borderColor: '#fde68a', display: 'flex', gap: 10 }}>
          <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.7 }}>
            <b>{isAr ? 'الحفظ من اللوحة متوقف.' : 'Saving from the dashboard is off.'}</b>{' '}
            {isAr
              ? 'أضف متغير SECRETS_MASTER_KEY في Railway (قيمة عشوائية 32 حرف أو أكثر، مثلاً من الأمر openssl rand -base64 48) ثم أعد تشغيل الخادم. لا تغيّره بعدها، لأن المفاتيح المحفوظة تُفك بهذا المفتاح.'
              : 'Add SECRETS_MASTER_KEY in Railway (a random value of 32+ characters, e.g. openssl rand -base64 48) and restart. Never change it afterwards: saved keys are decrypted with it.'}
          </div>
        </div>
      )}
      {data.store.lastError && (
        <div style={{ ...card, padding: 12, marginBottom: 16, background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', fontSize: 13 }}>
          {isAr ? 'تعذّر فك بعض المفاتيح المحفوظة، تأكد أن SECRETS_MASTER_KEY لم يتغيّر.' : 'Some saved keys could not be decrypted; check SECRETS_MASTER_KEY has not changed.'}
        </div>
      )}
      <div style={{ ...card, padding: 12, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#475569' }}>
        <ShieldCheck size={18} color="#059669" />
        {data.stepUp.required
          ? (isAr ? `أي تعديل يطلب رمز تحقق يُرسل لجوالك ${data.stepUp.phoneHint || ''} (صالح 10 دقائق).` : `Changes ask for a code sent to ${data.stepUp.phoneHint || 'your phone'} (valid 10 minutes).`)
          : (isAr ? 'مزوّد رسائل التحقق غير مضبوط، لذلك لا يُطلب رمز الآن. ابدأ بمفتاح Authentica.' : 'No OTP provider yet, so no code is asked. Start with the Authentica key.')}
      </div>

      {grouped.map(({ group, keys }) => (
        <section key={group.id} style={{ ...card, marginBottom: 16 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{isAr ? group.ar : group.en}</div>
            {group.id === 'ai' && (
              <button type="button" onClick={testAi} disabled={testing} style={btn(false, testing)}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : (isAr ? 'اختبار الاتصال' : 'Test connection')}
              </button>
            )}
          </div>
          {keys.map((k) => (
            <div key={k.key} style={{ padding: '14px 18px', borderBottom: '1px solid #f8fafc', display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) 1fr', gap: 14, alignItems: 'start' }} className="max-md:!grid-cols-1">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {k.secret && <Lock size={12} color="#64748b" />} {isAr ? k.label.ar : k.label.en}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', direction: 'ltr', textAlign: isAr ? 'right' : 'left', marginTop: 2 }}>{k.key}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {sourceBadge(k)}
                  {k.secret && k.masked && <span style={badge('#f8fafc', '#334155')} dir="ltr">{k.masked}</span>}
                  {!k.live && <span style={badge('#fff7ed', '#c2410c')} title={isAr ? 'يُقرأ عند تشغيل الخادم' : 'Read when the server starts'}>{isAr ? 'يحتاج إعادة تشغيل' : 'Needs restart'}</span>}
                  {k.restartNeeded && <span style={badge('#fef2f2', '#b91c1c')}>{isAr ? 'أعد تشغيل الخادم لتطبيقه' : 'Restart to apply'}</span>}
                </div>
                {k.updatedAt && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    <CheckCircle2 size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />{' '}
                    {new Date(k.updatedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB')}{k.updatedByName ? ` · ${k.updatedByName}` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>{renderEditor(k)}</div>
                {k.source === 'dashboard' && (
                  <button type="button" onClick={() => clear(k)} disabled={busyKey === k.key} style={btn(false, busyKey === k.key)} title={isAr ? 'حذف والرجوع لقيمة Railway' : 'Remove and fall back to Railway'}>
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
        {isAr
          ? 'مفاتيح التشغيل الأساسية (رابط قاعدة البيانات، JWT_SECRET، SECRETS_MASTER_KEY) تبقى في Railway فقط ولا يمكن تعديلها من هنا.'
          : 'Bootstrap secrets (database URL, JWT_SECRET, SECRETS_MASTER_KEY) stay in Railway only and cannot be edited here.'}
      </p>

      {stepUpOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <form onSubmit={verifyCode} style={{ ...card, padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{isAr ? 'تحقق إضافي' : 'Confirm it is you'}</div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              {isAr ? `أرسل رمزًا إلى جوالك ${data.stepUp.phoneHint || ''} واكتبه هنا.` : `Send a code to ${data.stepUp.phoneHint || 'your phone'} and enter it.`}
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" maxLength={6} placeholder="••••" style={{ ...input, letterSpacing: 4, textAlign: 'center' }} dir="ltr" autoFocus />
              <button type="button" onClick={sendCode} disabled={sending} style={btn(false, sending)}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : (isAr ? 'أرسل الرمز' : 'Send code')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setStepUpOpen(false); setPending(null); }} style={btn()}>{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" disabled={verifying || otp.length < 4} style={btn(true, verifying || otp.length < 4)}>
                {verifying ? <Loader2 size={14} className="animate-spin" /> : (isAr ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
