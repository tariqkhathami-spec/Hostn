'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User, Lock, Crown, Loader2, Save, Eye, EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateUser, upgradeToHost } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(res.data.user || res.data.data || { ...user!, name: name.trim(), phone: phone.trim() });
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
            <input
              type="email"
              value={user.email}
              disabled
              className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'ar' ? '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641' : 'Phone'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder={lang === 'ar' ? '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641' : 'Phone number'}
            />
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
