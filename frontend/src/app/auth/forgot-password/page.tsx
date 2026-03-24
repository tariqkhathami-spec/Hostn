'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(language === 'ar' ? 'يرجى إدخال بريدك الإلكتروني' : 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Hostn</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-card p-8">
          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}
              </h1>
              <p className="text-sm text-gray-500 text-center mb-6">
                {language === 'ar'
                  ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور'
                  : "Enter your email and we'll send you a link to reset your password"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoComplete="email"
                />
                <Button type="submit" isLoading={loading} size="lg" className="w-full">
                  {language === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {language === 'ar' ? 'تم الإرسال!' : 'Email Sent!'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {language === 'ar'
                  ? 'إذا كان هذا البريد مسجلاً لدينا، ستصلك رسالة بها رابط لإعادة تعيين كلمة المرور.'
                  : 'If this email is registered with us, you will receive a password reset link shortly.'}
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
