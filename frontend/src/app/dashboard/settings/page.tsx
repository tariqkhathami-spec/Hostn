'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User, Lock, Crown, Loader2, Save, Eye, EyeOff, Mail, Check, ChevronDown, Phone,
} from 'lucide-react';

const GCC_COUNTRIES = [
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', en: 'Saudi Arabia', ar: '\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629', digits: 9, startsWith: '5' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', en: 'UAE', ar: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A', digits: 9, startsWith: '5' },
  { code: '+973', flag: '\u{1F1E7}\u{1F1ED}', en: 'Bahrain', ar: '\u0627\u0644\u0628\u062D\u0631\u064A\u0646', digits: 8, startsWith: '' },
  { code: '+965', flag: '\u{1F1F0}\u{1F1FC}', en: 'Kuwait', ar: '\u0627\u0644\u0643\u0648\u064A\u062A', digits: 8, startsWith: '' },
  { code: '+968', flag: '\u{1F1F4}\u{1F1F2}', en: 'Oman', ar: '\u0639\u064F\u0645\u0627\u0646', digits: 8, startsWith: '' },
  { code: '+974', flag: '\u{1F1F6}\u{1F1E6}', en: 'Qatar', ar: '\u0642\u0637\u0631', digits: 8, startsWith: '' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateUser, upgradeToHost } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(GCC_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Phone editing with OTP
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneCountry, setNewPhoneCountry] = useState(GCC_COUNTRIES[0]);
  const [showNewCountryPicker, setShowNewCountryPicker] = useState(false);
  const newCountryRef = useRef<HTMLDivElement>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [upgrading, setUpgrading] = useState(false);

  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      // Parse country code from stored phone (e.g. "+966512345678")
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

  // Close country pickers on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
      if (newCountryRef.current && !newCountryRef.current.contains(e.target as Node)) {
        setShowNewCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: name.trim() });
      updateUser(res.data.user || res.data.data || { ...user!, name: name.trim() });
      toast.success(lang === 'ar' ? '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a' : 'Profile updated');
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b' : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error(lang === 'ar' ? '\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629' : 'All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error(lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' : 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(lang === 'ar' ? '\u0643\u0644\u0645\u062a\u0627 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u062a\u064a\u0646' : 'Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success(lang === 'ar' ? '\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeToHost();
      toast.success(lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u062a\u0631\u0642\u064a\u0629 \u0628\u0646\u062c\u0627\u062d!' : 'Upgraded to host!');
      router.push('/host');
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u062a\u0631\u0642\u064a\u0629' : 'Failed to upgrade');
      setUpgrading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!newPhone || newPhone.length < newPhoneCountry.digits) {
      toast.error(lang === 'ar' ? '\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D' : 'Invalid phone number');
      return;
    }
    const fullPhone = `${newPhoneCountry.code}${newPhone}`;
    const currentFull = `${selectedCountry.code}${phone}`;
    if (fullPhone === currentFull) {
      toast.error(lang === 'ar' ? '\u0647\u0630\u0627 \u0631\u0642\u0645\u0643 \u0627\u0644\u062D\u0627\u0644\u064A' : 'This is your current number');
      return;
    }
    setPhoneSaving(true);
    try {
      await authApi.sendOtp({ phone: newPhone, countryCode: newPhoneCountry.code, method: 'sms', lang });
      setPhoneCodeSent(true);
      toast.success(lang === 'ar' ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Verification code sent');
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632' : 'Failed to send code');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode || phoneCode.length < 4) {
      toast.error(lang === 'ar' ? '\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Enter the verification code');
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
      toast.success(lang === 'ar' ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641' : 'Phone updated successfully');
      setEditingPhone(false);
      setPhoneCodeSent(false);
      setNewPhone('');
      setPhoneCode('');
    } catch {
      toast.error(lang === 'ar' ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D' : 'Invalid verification code');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      toast.error(lang === 'ar' ? '\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D' : 'Invalid email address');
      return;
    }
    if (newEmail === user?.email) {
      toast.error(lang === 'ar' ? '\u0647\u0630\u0627 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u062D\u0627\u0644\u064A' : 'This is your current email');
      return;
    }
    setEmailSaving(true);
    try {
      await authApi.updateProfile({ email: newEmail } as Parameters<typeof authApi.updateProfile>[0]);
      setEmailCodeSent(true);
      toast.success(lang === 'ar' ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Verification code sent to new email');
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F' : 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length < 4) {
      toast.error(lang === 'ar' ? '\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Enter the verification code');
      return;
    }
    setEmailSaving(true);
    try {
      // This would verify the code and update the email
      // For now, update profile directly — backend should handle verification
      const res = await authApi.updateProfile({ email: newEmail, emailVerificationCode: emailCode } as Parameters<typeof authApi.updateProfile>[0]);
      updateUser(res.data.user || res.data.data || { ...user!, email: newEmail });
      toast.success(lang === 'ar' ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F \u0628\u0646\u062C\u0627\u062D' : 'Email updated successfully');
      setEditingEmail(false);
      setEmailCodeSent(false);
      setNewEmail('');
      setEmailCode('');
    } catch {
      toast.error(lang === 'ar' ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D' : 'Invalid verification code');
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

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'ar' ? '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Settings'}
        </h1>
        <p className="text-gray-500 mt-1">
          {lang === 'ar' ? '\u0625\u062f\u0627\u0631\u0629 \u062d\u0633\u0627\u0628\u0643 \u0648\u062a\u0641\u0636\u064a\u0644\u0627\u062a\u0643' : 'Manage your account and preferences'}
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {lang === 'ar' ? '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a' : 'Profile'}
          </h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645' : 'Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={lang === 'ar' ? '\u0627\u062f\u062e\u0644 \u0627\u0633\u0645\u0643' : 'Enter your name'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a' : 'Email'}
            </label>
            {!editingEmail ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={user.email || (lang === 'ar' ? '\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062F' : 'Not set')}
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed flex-1`}
                />
                <button
                  type="button"
                  onClick={() => { setEditingEmail(true); setNewEmail(user.email || ''); }}
                  className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {lang === 'ar' ? '\u062A\u0639\u062F\u064A\u0644' : 'Edit'}
                </button>
              </div>
            ) : !emailCodeSent ? (
              <div className="space-y-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClass}
                  placeholder={lang === 'ar' ? '\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u062C\u062F\u064A\u062F' : 'Enter new email'}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={emailSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    {lang === 'ar' ? '\u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Send Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingEmail(false); setNewEmail(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {lang === 'ar' ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 ${newEmail}` : `Verification code sent to ${newEmail}`}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center tracking-widest font-mono`}
                  placeholder="000000"
                  autoFocus
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={emailSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {lang === 'ar' ? '\u062A\u0623\u0643\u064A\u062F' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailCodeSent(false); setEmailCode(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {lang === 'ar' ? '\u0631\u062C\u0648\u0639' : 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641' : 'Phone'}
            </label>
            {!editingPhone ? (
              <div className="flex gap-2">
                <div className="flex gap-2 flex-1" dir="ltr">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500 min-w-[105px]">
                    <span className="text-lg leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      disabled
                      className={`${inputClass} pl-9 bg-gray-50 text-gray-500 cursor-not-allowed`}
                      dir="ltr"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPhone(true); setNewPhone(''); setNewPhoneCountry(selectedCountry); }}
                  className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {lang === 'ar' ? '\u062A\u0639\u062F\u064A\u0644' : 'Edit'}
                </button>
              </div>
            ) : !phoneCodeSent ? (
              <div className="space-y-2">
                <div className="flex gap-2" dir="ltr">
                  <div className="relative" ref={newCountryRef}>
                    <button
                      type="button"
                      onClick={() => setShowNewCountryPicker(!showNewCountryPicker)}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-100 transition-colors min-w-[105px] h-full"
                    >
                      <span className="text-lg leading-none">{newPhoneCountry.flag}</span>
                      <span>{newPhoneCountry.code}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showNewCountryPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showNewCountryPicker && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px]">
                        {GCC_COUNTRIES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => { setNewPhoneCountry(country); setShowNewCountryPicker(false); setNewPhone(''); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                              newPhoneCountry.code === country.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-lg leading-none">{country.flag}</span>
                            <span className="flex-1 text-start">{lang === 'ar' ? country.ar : country.en}</span>
                            <span className="text-gray-400 font-mono text-xs">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, newPhoneCountry.digits))}
                      className={`${inputClass} pl-9`}
                      placeholder={newPhoneCountry.startsWith ? `${newPhoneCountry.startsWith}XXXXXXXX` : 'XXXXXXXX'}
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendPhoneCode}
                    disabled={phoneSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {phoneSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                    {lang === 'ar' ? '\u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Send Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingPhone(false); setNewPhone(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {lang === 'ar' ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  {lang === 'ar'
                    ? `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 ${newPhoneCountry.code}${newPhone}`
                    : `Verification code sent to ${newPhoneCountry.code}${newPhone}`}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center tracking-widest font-mono`}
                  placeholder="000000"
                  autoFocus
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyPhone}
                    disabled={phoneSaving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {phoneSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {lang === 'ar' ? '\u062A\u0623\u0643\u064A\u062F' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhoneCodeSent(false); setPhoneCode(''); }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {lang === 'ar' ? '\u0631\u062C\u0648\u0639' : 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {lang === 'ar' ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Become a Host Section */}
      {user.role === 'guest' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lang === 'ar' ? '\u0643\u0646 \u0645\u0636\u064a\u0641\u0627\u064b' : 'Become a Host'}
              </h2>
              <p className="text-sm text-gray-500">
                {lang === 'ar'
                  ? '\u0642\u0645 \u0628\u062a\u0631\u0642\u064a\u0629 \u062d\u0633\u0627\u0628\u0643 \u0644\u0625\u062f\u0631\u0627\u062c \u0639\u0642\u0627\u0631\u0627\u062a\u0643'
                  : 'Upgrade your account to list your properties'}
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50"
          >
            {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
            {lang === 'ar' ? '\u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u0622\u0646' : 'Upgrade Now'}
          </button>
        </div>
      )}

      {/* Change Password Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {lang === 'ar' ? '\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Change Password'}
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputClass} pe-10`}
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputClass} pe-10`}
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Confirm Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {lang === 'ar' ? '\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
