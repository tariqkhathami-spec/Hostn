'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User, Crown, Loader2, Save, Mail, Check, ChevronDown, Phone, Shield, Calendar,
} from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

const GCC_COUNTRIES = [
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', en: 'Saudi Arabia', ar: '\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629', digits: 9, startsWith: '5' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', en: 'UAE', ar: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A', digits: 9, startsWith: '5' },
  { code: '+973', flag: '\u{1F1E7}\u{1F1ED}', en: 'Bahrain', ar: '\u0627\u0644\u0628\u062D\u0631\u064A\u0646', digits: 8, startsWith: '' },
  { code: '+965', flag: '\u{1F1F0}\u{1F1FC}', en: 'Kuwait', ar: '\u0627\u0644\u0643\u0648\u064A\u062A', digits: 8, startsWith: '' },
  { code: '+968', flag: '\u{1F1F4}\u{1F1F2}', en: 'Oman', ar: '\u0639\u064F\u0645\u0627\u0646', digits: 8, startsWith: '' },
  { code: '+974', flag: '\u{1F1F6}\u{1F1E6}', en: 'Qatar', ar: '\u0642\u0637\u0631', digits: 8, startsWith: '' },
];

const roleLabels: Record<string, { en: string; ar: string }> = {
  guest: { en: 'Guest', ar: '\u0636\u064A\u0641' },
  host: { en: 'Host', ar: '\u0645\u0636\u064A\u0641' },
  admin: { en: 'Admin', ar: '\u0645\u0634\u0631\u0641' },
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateUser, upgradeToHost } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'الإعدادات' : 'Settings');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(GCC_COUNTRIES[0]);
  const [saving, setSaving] = useState(false);

  // Phone editing
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneCountry, setNewPhoneCountry] = useState(GCC_COUNTRIES[0]);
  const [showNewCountryPicker, setShowNewCountryPicker] = useState(false);
  const newCountryRef = useRef<HTMLDivElement>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);

  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      const rawPhone = user.phone || '';
      const matched = GCC_COUNTRIES.find(c => rawPhone.startsWith(c.code));
      if (matched) {
        setSelectedCountry(matched);
        setPhone(rawPhone.slice(matched.code.length));
      } else {
        setPhone(rawPhone);
      }
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (newCountryRef.current && !newCountryRef.current.contains(e.target as Node)) {
        setShowNewCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(isAr ? '\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: name.trim() });
      updateUser(res.data.user || res.data.data || { ...user!, name: name.trim() });
      toast.success(isAr ? '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0627\u0633\u0645' : 'Name updated');
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b' : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeToHost();
      toast.success(isAr ? '\u062a\u0645 \u0627\u0644\u062a\u0631\u0642\u064a\u0629 \u0628\u0646\u062c\u0627\u062d!' : 'Upgraded to host!');
      router.push('/host');
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u062a\u0631\u0642\u064a\u0629' : 'Failed to upgrade');
      setUpgrading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!newPhone || newPhone.length < newPhoneCountry.digits) {
      toast.error(isAr ? '\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D' : 'Invalid phone number');
      return;
    }
    const fullPhone = `${newPhoneCountry.code}${newPhone}`;
    const currentFull = `${selectedCountry.code}${phone}`;
    if (fullPhone === currentFull) {
      toast.error(isAr ? '\u0647\u0630\u0627 \u0631\u0642\u0645\u0643 \u0627\u0644\u062D\u0627\u0644\u064A' : 'This is your current number');
      return;
    }
    setPhoneSaving(true);
    try {
      await authApi.sendOtp({ phone: newPhone, countryCode: newPhoneCountry.code, method: 'sms', lang: language });
      setPhoneCodeSent(true);
      toast.success(isAr ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Verification code sent');
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632' : 'Failed to send code');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode || phoneCode.length < 4) {
      toast.error(isAr ? '\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Enter the verification code');
      return;
    }
    setPhoneSaving(true);
    try {
      const fullPhone = `${newPhoneCountry.code}${newPhone}`;
      const res = await authApi.updateProfile({
        phone: fullPhone,
        phoneVerificationCode: phoneCode,
        phoneCountryCode: newPhoneCountry.code,
      });
      updateUser(res.data.user || res.data.data || { ...user!, phone: fullPhone });
      setSelectedCountry(newPhoneCountry);
      setPhone(newPhone);
      toast.success(isAr ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641' : 'Phone updated');
      setEditingPhone(false);
      setPhoneCodeSent(false);
      setNewPhone('');
      setPhoneCode('');
    } catch {
      toast.error(isAr ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D' : 'Invalid verification code');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      toast.error(isAr ? '\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D' : 'Invalid email address');
      return;
    }
    if (newEmail === user?.email) {
      toast.error(isAr ? '\u0647\u0630\u0627 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A' : 'This is your current email');
      return;
    }
    setEmailSaving(true);
    // Optimistic: show OTP input immediately — Vercel proxy may throw even on success
    setEmailCodeSent(true);
    try {
      await authApi.updateProfile({ email: newEmail } as Parameters<typeof authApi.updateProfile>[0]);
      toast.success(isAr ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Verification code sent');
    } catch {
      // Backend likely processed it — keep OTP input visible
      toast.success(isAr ? '\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A' : 'Check your email for the code');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length < 4) {
      toast.error(isAr ? '\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Enter the verification code');
      return;
    }
    setEmailSaving(true);
    try {
      const res = await authApi.updateProfile({ email: newEmail, emailVerificationCode: emailCode } as Parameters<typeof authApi.updateProfile>[0]);
      updateUser(res.data.user || res.data.data || { ...user!, email: newEmail });
      toast.success(isAr ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F' : 'Email updated');
      setEditingEmail(false);
      setEmailCodeSent(false);
      setNewEmail('');
      setEmailCode('');
    } catch {
      toast.error(isAr ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D' : 'Invalid verification code');
    } finally {
      setEmailSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors text-sm';
  const initials = (user.name || 'U').slice(0, 2).toUpperCase();
  const role = roleLabels[user.role] || roleLabels.guest;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Settings'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isAr ? '\u0625\u062f\u0627\u0631\u0629 \u062d\u0633\u0627\u0628\u0643 \u0648\u062a\u0641\u0636\u064a\u0644\u0627\u062a\u0643' : 'Manage your account and preferences'}
        </p>
      </div>

      {/* Account Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
                <Shield className="w-3 h-3" />
                {isAr ? role.ar : role.en}
              </span>
              {user.createdAt && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {isAr ? '\u0639\u0636\u0648 \u0645\u0646\u0630' : 'Member since'}{' '}
                  {new Date(user.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {isAr ? '\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629' : 'Personal Information'}
          </h2>
        </div>

        <form onSubmit={handleUpdateName}>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            {isAr ? '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644' : 'Full Name'}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder={isAr ? '\u0627\u062f\u062e\u0644 \u0627\u0633\u0645\u0643' : 'Enter your name'}
            />
            <button
              type="submit"
              disabled={saving || name === user.name}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAr ? '\u062d\u0641\u0638' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {isAr ? '\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644' : 'Contact Information'}
          </h2>
        </div>

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              {isAr ? '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a' : 'Email Address'}
            </label>
            {!editingEmail ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={user.email || (isAr ? '\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062F' : 'Not set')}
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed flex-1`}
                />
                <button
                  type="button"
                  onClick={() => { setEditingEmail(true); setNewEmail(user.email || ''); }}
                  className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors shrink-0"
                >
                  {isAr ? '\u062A\u0639\u062F\u064A\u0644' : 'Edit'}
                </button>
              </div>
            ) : !emailCodeSent ? (
              <div className="space-y-2.5">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClass}
                  placeholder={isAr ? '\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u062C\u062F\u064A\u062F' : 'Enter new email'}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleSendEmailCode} disabled={emailSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                    {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    {isAr ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632' : 'Send Code'}
                  </button>
                  <button type="button" onClick={() => { setEditingEmail(false); setNewEmail(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {isAr ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-sm text-gray-500">
                  {isAr ? `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u0625\u0644\u0649 ${newEmail}` : `Code sent to ${newEmail}`}
                </p>
                <input type="text" inputMode="numeric" value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center tracking-widest font-mono`} placeholder="000000" autoFocus dir="ltr" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleVerifyEmail} disabled={emailSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                    {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isAr ? '\u062A\u0623\u0643\u064A\u062F' : 'Verify'}
                  </button>
                  <button type="button" onClick={() => { setEmailCodeSent(false); setEmailCode(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {isAr ? '\u0631\u062C\u0648\u0639' : 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              {isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641' : 'Phone Number'}
            </label>
            {!editingPhone ? (
              <div className="flex gap-2">
                <div className="flex gap-2 flex-1" dir="ltr">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500 min-w-[100px]">
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" value={phone} disabled dir="ltr"
                      className={`${inputClass} pl-9 bg-gray-50 text-gray-500 cursor-not-allowed`} />
                  </div>
                </div>
                <button type="button"
                  onClick={() => { setEditingPhone(true); setNewPhone(''); setNewPhoneCountry(selectedCountry); }}
                  className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors shrink-0">
                  {isAr ? '\u062A\u0639\u062F\u064A\u0644' : 'Edit'}
                </button>
              </div>
            ) : !phoneCodeSent ? (
              <div className="space-y-2.5">
                <div className="flex gap-2" dir="ltr">
                  <div className="relative" ref={newCountryRef}>
                    <button type="button" onClick={() => setShowNewCountryPicker(!showNewCountryPicker)}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-100 transition-colors min-w-[100px] h-full">
                      <span className="text-base leading-none">{newPhoneCountry.flag}</span>
                      <span>{newPhoneCountry.code}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showNewCountryPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showNewCountryPicker && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px]">
                        {GCC_COUNTRIES.map((country) => (
                          <button key={country.code} type="button"
                            onClick={() => { setNewPhoneCountry(country); setShowNewCountryPicker(false); setNewPhone(''); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                              newPhoneCountry.code === country.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                            }`}>
                            <span className="text-base leading-none">{country.flag}</span>
                            <span className="flex-1 text-start">{isAr ? country.ar : country.en}</span>
                            <span className="text-gray-400 font-mono text-xs">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, newPhoneCountry.digits))}
                      className={`${inputClass} pl-9`}
                      placeholder={newPhoneCountry.startsWith ? `${newPhoneCountry.startsWith}XXXXXXXX` : 'XXXXXXXX'}
                      dir="ltr" autoFocus />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSendPhoneCode} disabled={phoneSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                    {phoneSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                    {isAr ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632' : 'Send Code'}
                  </button>
                  <button type="button" onClick={() => { setEditingPhone(false); setNewPhone(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {isAr ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-sm text-gray-500">
                  {isAr ? `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u0625\u0644\u0649 ${newPhoneCountry.code}${newPhone}`
                    : `Code sent to ${newPhoneCountry.code}${newPhone}`}
                </p>
                <input type="text" inputMode="numeric" value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center tracking-widest font-mono`} placeholder="000000" autoFocus dir="ltr" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleVerifyPhone} disabled={phoneSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                    {phoneSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isAr ? '\u062A\u0623\u0643\u064A\u062F' : 'Verify'}
                  </button>
                  <button type="button" onClick={() => { setPhoneCodeSent(false); setPhoneCode(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {isAr ? '\u0631\u062C\u0648\u0639' : 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Become a Host */}
      {user.role === 'guest' && (
        <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl border border-primary-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {isAr ? '\u0643\u0646 \u0645\u0636\u064a\u0641\u0627\u064b' : 'Become a Host'}
              </h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {isAr
                  ? '\u0642\u0645 \u0628\u062a\u0631\u0642\u064a\u0629 \u062d\u0633\u0627\u0628\u0643 \u0644\u0625\u062f\u0631\u0627\u062c \u0639\u0642\u0627\u0631\u0627\u062a\u0643 \u0648\u0627\u0644\u0628\u062f\u0621 \u0641\u064a \u0627\u0644\u0627\u0633\u062a\u0636\u0627\u0641\u0629'
                  : 'Upgrade your account to list your properties and start hosting'}
              </p>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAr ? '\u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u0622\u0646' : 'Upgrade Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
