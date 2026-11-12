'use client';

import { Suspense, useState } from 'react';
import { LogoMark } from '@/components/ui/Logo';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Lock, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import toast from 'react-hot-toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isAr ? 'رابط غير صالح' : 'Invalid Reset Link'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {isAr ? 'رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.' : 'This password reset link is invalid or has expired.'}
          </p>
          <Link href="/auth/forgot-password">
            <Button className="w-full">{isAr ? 'طلب رابط جديد' : 'Request New Link'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        toast.success(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password reset successfully');
      } else {
        setError(data.message || (isAr ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password'));
      }
    } catch {
      setError(isAr ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isAr ? 'تم تغيير كلمة المرور' : 'Password Reset Successfully'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {isAr ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.' : 'You can now sign in with your new password.'}
          </p>
          <Link href="/auth">
            <Button className="w-full">{isAr ? 'تسجيل الدخول' : 'Sign In'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <span className="flex-shrink-0"><LogoMark size={36} /></span>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Hostn</span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Your Password'}
          </h1>
          <p className="text-sm text-gray-500">
            {isAr ? 'أدخل كلمة المرور الجديدة أدناه' : 'Enter your new password below'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={isAr ? 'كلمة المرور الجديدة' : 'New Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={isAr ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <Input
            label={isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
            leftIcon={<Shield className="w-4 h-4" />}
          />
          <Button type="submit" isLoading={loading} size="lg" className="w-full">
            {isAr ? 'تعيين كلمة المرور الجديدة' : 'Set New Password'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/auth" className="text-primary-600 hover:text-primary-700 font-medium">
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
