'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostFinanceApi } from '@/lib/api';
import { CreditCard, Clock, Pencil, Trash2, Plus, Loader2, X } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';

interface BankAccount {
  _id: string;
  bankName: string;
  bankNameAr?: string;
  iban: string;
  accountHolder: string;
  isActive: boolean;
  isVerified: boolean;
  transferDuration?: {
    type: 'after_departure' | 'amount_threshold' | 'weekly';
    hours: number;
    thresholdAmount?: number;
    weeklyDay?: number;
  };
}

// Day-of-week constants (0=Sunday … 6=Saturday)
const DAYS = [
  { en: 'Sun', ar: 'الأحد' },
  { en: 'Mon', ar: 'الاثنين' },
  { en: 'Tue', ar: 'الثلاثاء' },
  { en: 'Wed', ar: 'الأربعاء' },
  { en: 'Thu', ar: 'الخميس' },
  { en: 'Fri', ar: 'الجمعة' },
  { en: 'Sat', ar: 'السبت' },
];

const t: Record<string, Record<string, string>> = {
  title: { en: 'Payment Method', ar: 'طريقة استلامك للمبالغ' },
  paymentReception: { en: 'Payment Reception Method', ar: 'طريقة استلام المبالغ' },
  receptionMethod: { en: 'Reception Method', ar: 'طريقة الاستلام' },
  bankTransfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  bankName: { en: 'Bank Name', ar: 'اسم البنك' },
  bankNameAr: { en: 'Bank Name (Arabic)', ar: 'اسم البنك (عربي)' },
  iban: { en: 'IBAN', ar: 'رقم الايبان' },
  accountHolder: { en: 'Account Holder', ar: 'اسم صاحب الحساب' },
  edit: { en: 'Edit', ar: 'تعديل' },
  delete: { en: 'Delete', ar: 'حذف' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  addBank: { en: 'Add Bank Account', ar: 'إضافة حساب بنكي' },
  noBankAccount: { en: 'No bank account added', ar: 'لم يتم إضافة حساب بنكي' },
  noBankDesc: { en: 'Add your bank account to receive payouts', ar: 'أضف حسابك البنكي لاستلام الحوالات' },
  // Transfer Duration
  transferDuration: { en: 'Transfer Duration', ar: 'مدة تحويل المبالغ لحسابك' },
  transferDurationSubtitle: { en: 'Choose your preferred transfer duration', ar: 'اختر المدة التي تفضل تحويل المبالغ خلالها' },
  afterDeparture: { en: 'Direct transfer (48 hours after guest departure)', ar: 'التحويل المباشر (بعد 48 ساعة من مغادرة الضيف) افتراضي' },
  amountThreshold: { en: 'Transfer upon reaching a specific amount', ar: 'التحويل عند وصول لمبلغ محدد' },
  weeklyTransfer: { en: 'Weekly transfer', ar: 'التحويل الأسبوعي' },
  enterAmount: { en: 'Enter amount', ar: 'أدخل المبلغ' },
  sar: { en: 'SAR', ar: 'ر.س' },
  selectDay: { en: 'Select the day you want to receive the transfer', ar: 'حدد اليوم الذي ترغب بوصول الحوالة فيه' },
  hours: { en: 'hours', ar: 'ساعة' },
  ibanError: { en: 'IBAN must start with SA followed by 22 digits', ar: 'رقم الايبان يجب أن يبدأ بـ SA متبوعًا بـ 22 رقم' },
  required: { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
  savedSuccess: { en: 'Saved successfully', ar: 'تم الحفظ بنجاح' },
  deletedSuccess: { en: 'Bank account deleted', ar: 'تم حذف الحساب البنكي' },
  deleteConfirm: { en: 'Are you sure you want to delete this bank account?', ar: 'هل أنت متأكد من حذف هذا الحساب البنكي؟' },
  durationSaved: { en: 'Transfer duration updated', ar: 'تم تحديث مدة التحويل' },
};

function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return iban;
  return `${iban.slice(0, 4)}${'*'.repeat(iban.length - 8)}${iban.slice(-4)}`;
}

/** Map legacy transfer duration type values to new enum */
function mapDurationType(raw: string | undefined): 'after_departure' | 'amount_threshold' | 'weekly' {
  if (raw === 'amount_threshold') return 'amount_threshold';
  if (raw === 'weekly') return 'weekly';
  return 'after_departure'; // covers 'default', 'after_departure', undefined
}

export default function PaymentMethodPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'طريقة الاستلام' : 'Payment Method');

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bank editing
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', bankNameAr: '', iban: '', accountHolder: '' });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  // Transfer duration editing
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationForm, setDurationForm] = useState({
    type: 'after_departure' as 'after_departure' | 'amount_threshold' | 'weekly',
    thresholdAmount: 1000,
    weeklyDay: 0,
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const res = await hostFinanceApi.getBankAccount();
      const acc = res.data?.data || null;
      setAccount(acc);
      if (acc) {
        setBankForm({
          bankName: acc.bankName || '',
          bankNameAr: acc.bankNameAr || '',
          iban: acc.iban || '',
          accountHolder: acc.accountHolder || '',
        });
        setDurationForm({
          type: mapDurationType(acc.transferDuration?.type as string | undefined),
          thresholdAmount: acc.transferDuration?.thresholdAmount || 1000,
          weeklyDay: acc.transferDuration?.weeklyDay ?? 0,
        });
      }
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const validateBank = (): boolean => {
    const errors: Record<string, string> = {};
    if (!bankForm.bankName.trim()) errors.bankName = t.required[lang];
    if (!bankForm.iban.trim()) errors.iban = t.required[lang];
    else if (!/^SA\d{22}$/.test(bankForm.iban.trim())) errors.iban = t.ibanError[lang];
    if (!bankForm.accountHolder.trim()) errors.accountHolder = t.required[lang];
    setBankErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBank = async () => {
    if (!validateBank()) return;
    setSaving(true);
    try {
      const res = await hostFinanceApi.upsertBankAccount({
        bankName: bankForm.bankName.trim(),
        bankNameAr: bankForm.bankNameAr.trim() || undefined,
        iban: bankForm.iban.trim(),
        accountHolder: bankForm.accountHolder.trim(),
      });
      setAccount(res.data?.data || null);
      setEditingBank(false);
      toast.success(t.savedSuccess[lang]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await hostFinanceApi.deleteBankAccount();
      setAccount(null);
      setBankForm({ bankName: '', bankNameAr: '', iban: '', accountHolder: '' });
      setShowDeleteConfirm(false);
      setEditingBank(false);
      toast.success(t.deletedSuccess[lang]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDuration = async () => {
    setSaving(true);
    try {
      const res = await hostFinanceApi.updateTransferDuration({
        type: durationForm.type,
        thresholdAmount: durationForm.type === 'amount_threshold' ? durationForm.thresholdAmount : undefined,
        weeklyDay: durationForm.type === 'weekly' ? durationForm.weeklyDay : undefined,
      });
      setAccount(res.data?.data || null);
      setEditingDuration(false);
      toast.success(t.durationSaved[lang]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const resetDurationForm = () => {
    setEditingDuration(false);
    setDurationForm({
      type: mapDurationType(account?.transferDuration?.type as string | undefined),
      thresholdAmount: account?.transferDuration?.thresholdAmount || 1000,
      weeklyDay: account?.transferDuration?.weeklyDay ?? 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      <div className="space-y-6">
        {/* Card 1: Bank Account */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">{t.paymentReception[lang]}</h2>
            </div>
            {account && !editingBank && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingBank(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t.edit[lang]}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.delete[lang]}
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            {editingBank || !account ? (
              /* Edit / Add mode */
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankName[lang]} *</label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {bankErrors.bankName && <p className="text-xs text-red-500 mt-1">{bankErrors.bankName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankNameAr[lang]}</label>
                  <input
                    type="text"
                    value={bankForm.bankNameAr}
                    onChange={(e) => setBankForm({ ...bankForm, bankNameAr: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.iban[lang]} *</label>
                  <input
                    type="text"
                    value={bankForm.iban}
                    onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase() })}
                    placeholder="SA0000000000000000000000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                    dir="ltr"
                    maxLength={24}
                  />
                  {bankErrors.iban && <p className="text-xs text-red-500 mt-1">{bankErrors.iban}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountHolder[lang]} *</label>
                  <input
                    type="text"
                    value={bankForm.accountHolder}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {bankErrors.accountHolder && <p className="text-xs text-red-500 mt-1">{bankErrors.accountHolder}</p>}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveBank}
                    disabled={saving}
                    className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save[lang]}
                  </button>
                  {account && (
                    <button
                      onClick={() => {
                        setEditingBank(false);
                        setBankErrors({});
                        setBankForm({
                          bankName: account.bankName || '',
                          bankNameAr: account.bankNameAr || '',
                          iban: account.iban || '',
                          accountHolder: account.accountHolder || '',
                        });
                      }}
                      className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      {t.cancel[lang]}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Display mode */
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">{t.receptionMethod[lang]}</span>
                  <span className="text-sm font-medium text-gray-900">{t.bankTransfer[lang]}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-sm text-gray-500">{t.bankName[lang]}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {isAr && account.bankNameAr ? account.bankNameAr : account.bankName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-sm text-gray-500">{t.iban[lang]}</span>
                  <span className="text-sm font-medium text-gray-900 font-mono" dir="ltr">
                    {maskIban(account.iban)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-sm text-gray-500">{t.accountHolder[lang]}</span>
                  <span className="text-sm font-medium text-gray-900">{account.accountHolder}</span>
                </div>
              </div>
            )}

            {/* No account empty state */}
            {!account && !editingBank && (
              <div className="text-center py-8">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t.noBankAccount[lang]}</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">{t.noBankDesc[lang]}</p>
                <button
                  onClick={() => setEditingBank(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t.addBank[lang]}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Transfer Duration */}
        {account && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">{t.transferDuration[lang]}</h2>
              </div>
              {!editingDuration && (
                <button
                  onClick={() => setEditingDuration(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t.edit[lang]}
                </button>
              )}
            </div>

            <div className="p-5">
              {/* Subtitle */}
              <p className="text-sm text-gray-500 mb-4">{t.transferDurationSubtitle[lang]}</p>

              {editingDuration ? (
                /* ─── Edit Mode: 3 radio options ─── */
                <div className="space-y-3 max-w-lg">
                  {/* Option 1: After departure (default) */}
                  <label
                    className={`flex items-center gap-3 cursor-pointer py-2 ${
                      durationForm.type === 'after_departure' ? 'text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="durationType"
                      checked={durationForm.type === 'after_departure'}
                      onChange={() => setDurationForm({ ...durationForm, type: 'after_departure' })}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="text-sm">{t.afterDeparture[lang]}</span>
                  </label>

                  {/* Option 2: Amount threshold */}
                  <div>
                    <label
                      className={`flex items-center gap-3 cursor-pointer py-2 ${
                        durationForm.type === 'amount_threshold' ? 'text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="durationType"
                        checked={durationForm.type === 'amount_threshold'}
                        onChange={() => setDurationForm({ ...durationForm, type: 'amount_threshold' })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="text-sm">{t.amountThreshold[lang]}</span>
                    </label>
                    {/* SAR input — visible when threshold is selected */}
                    {durationForm.type === 'amount_threshold' && (
                      <div className="flex items-center gap-2 mt-2 ms-7">
                        <span className="text-sm text-gray-500 flex-shrink-0">{t.sar[lang]}</span>
                        <input
                          type="number"
                          min={100}
                          step={100}
                          value={durationForm.thresholdAmount}
                          onChange={(e) => setDurationForm({ ...durationForm, thresholdAmount: parseInt(e.target.value) || 1000 })}
                          placeholder={t.enterAmount[lang]}
                          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-sm text-gray-400">{t.enterAmount[lang]}</span>
                      </div>
                    )}
                  </div>

                  {/* Option 3: Weekly */}
                  <div>
                    <label
                      className={`flex items-center gap-3 cursor-pointer py-2 ${
                        durationForm.type === 'weekly' ? 'text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="durationType"
                        checked={durationForm.type === 'weekly'}
                        onChange={() => setDurationForm({ ...durationForm, type: 'weekly' })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="text-sm">{t.weeklyTransfer[lang]}</span>
                    </label>
                    {/* Day-of-week selector — visible when weekly is selected */}
                    {durationForm.type === 'weekly' && (
                      <div className="mt-3 ms-7">
                        <p className="text-xs text-gray-500 mb-2">{t.selectDay[lang]}</p>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map((day, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDurationForm({ ...durationForm, weeklyDay: idx })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                durationForm.weeklyDay === idx
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600'
                              }`}
                            >
                              {day[lang]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={handleSaveDuration}
                      disabled={saving}
                      className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save[lang]}
                    </button>
                    <button
                      onClick={resetDurationForm}
                      className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      {t.cancel[lang]}
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Display Mode: show the 3 options, highlight the active one ─── */
                <div className="space-y-3">
                  {(() => {
                    const dtype = account.transferDuration?.type as string | undefined;
                    const isAfterDep = dtype === 'after_departure' || dtype === 'default' || !dtype;
                    const isThreshold = dtype === 'amount_threshold';
                    const isWeekly = dtype === 'weekly';
                    const savedDay = account.transferDuration?.weeklyDay ?? 0;
                    return (
                      <>
                        {/* After departure */}
                        <div className={`flex items-center gap-3 py-2 ${isAfterDep ? '' : 'opacity-40'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isAfterDep ? 'border-primary-600' : 'border-gray-300'}`}>
                            {isAfterDep && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                          </div>
                          <span className="text-sm text-gray-900">{t.afterDeparture[lang]}</span>
                        </div>

                        {/* Amount threshold */}
                        <div className={`py-2 ${isThreshold ? '' : 'opacity-40'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isThreshold ? 'border-primary-600' : 'border-gray-300'}`}>
                              {isThreshold && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                            </div>
                            <span className="text-sm text-gray-900">{t.amountThreshold[lang]}</span>
                          </div>
                          {isThreshold && (
                            <p className="text-xs text-primary-600 font-medium mt-1 ms-7">
                              {account.transferDuration?.thresholdAmount?.toLocaleString() || '1,000'} {t.sar[lang]}
                            </p>
                          )}
                        </div>

                        {/* Weekly */}
                        <div className={`py-2 ${isWeekly ? '' : 'opacity-40'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isWeekly ? 'border-primary-600' : 'border-gray-300'}`}>
                              {isWeekly && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                            </div>
                            <span className="text-sm text-gray-900">{t.weeklyTransfer[lang]}</span>
                          </div>
                          {isWeekly && (
                            <div className="mt-2 ms-7">
                              <p className="text-xs text-gray-500 mb-1.5">{t.selectDay[lang]}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {DAYS.map((day, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                      savedDay === idx
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                                  >
                                    {day[lang]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t.delete[lang]}</h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">{t.deleteConfirm[lang]}</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.cancel[lang]}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.delete[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
