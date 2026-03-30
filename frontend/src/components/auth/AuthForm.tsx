'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, Eye, EyeOff, User, Phone, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

type Role = 'guest' | 'host' | 'admin';

interface AuthFormProps {
  mode: 'login' | 'register';
  role: Role;
}

const ROLE_CONFIG = {
  guest: {
    accent: 'primary',
    loginTitle: { en: 'Welcome back', ar: 'مرحباً بعودتك' },
    loginSubtitle: { en: 'Sign in to manage your bookings', ar: 'سجل دخولك لإدارة حجوزاتك' },
    registerTitle: { en: 'Create your account', ar: 'أنشئ حسابك' },
    registerSubtitle: { en: 'Start booking amazing stays in Saudi Arabia', ar: 'ابدأ بحجز إقامات مذهلة في السعودية' },
    redirect: '/dashboard',
  },
  host: {
    accent: 'emerald',
    loginTitle: { en: 'Host Dashboard', ar: 'لوحة المضيف' },
    loginSubtitle: { en: 'Sign in to manage your properties', ar: 'سجل دخولك لإدارة عقاراتك' },
    registerTitle: { en: 'Become a Host', ar: 'كن مضيفاً' },
    registerSubtitle: { en: 'List your property and start earning', ar: 'أدرج عقارك وابدأ بالكسب' },
    redirect: '/host',
  },
  admin: {
    accent: 'violet',
    loginTitle: { en: 'Admin Login', ar: 'دخول المشرف' },
    loginSubtitle: { en: 'Access the platform administration panel', ar: 'الوصول إلى لوحة إدارة المنصة' },
    registerTitle: { en: '', ar: '' },
    registerSubtitle: { en: '', ar: '' },
    redirect: '/admin',
  },
};

const ACCENT_CLASSES = {
  primary: {
    bg: 'bg-primary-600',
    hover: 'hover:bg-primary-700',
    text: 'text-primary-600',
    ring: 'focus:ring-primary-400',
    light: 'bg-primary-50',
    border: 'border-primary-200',
  },
  emerald: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    ring: 'focus:ring-emerald-400',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  violet: {
    bg: 'bg-violet-600',
    hover: 'hover:bg-violet-700',
    text: 'text-violet-600',
    ring: 'focus:ring-violet-400',
    light: 'bg-violet-50',
    border: 'border-violet-200',
  },
};

export default function AuthForm({ mode, role }: AuthFormProps) {
  const router = useRouter();
  const { login, loginWithOtp, register } = useAuth();
  const { language } = useLanguage();

  // Login method: phone+OTP for guest/host, email+password only for admin
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>(role === 'admin' ? 'email' : 'phone');

  // Email/password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const config = ROLE_CONFIG[role];
  const accent = ACCENT_CLASSES[config.accent as keyof typeof ACCENT_CLASSES];
  const isLogin = mode === 'login';
  const lang = language as 'en' | 'ar';

  const title = isLogin ? config.loginTitle[lang] : config.registerTitle[lang];
  const subtitle = isLogin ? config.loginSubtitle[lang] : config.registerSubtitle[lang];

  // OTP delivery method (SMS or WhatsApp)
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');

  // Start countdown timer (30 seconds)
  const startCountdown = () => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Send OTP
  const handleSendOtp = async (method: 'sms' | 'whatsapp' = otpMethod) => {
    if (!otpPhone || !/^5\d{8}$/.test(otpPhone)) {
      setErrors({ otpPhone: lang === 'ar' ? 'رقم هاتف سعودي غير صالح (9 أرقام تبدأ بـ 5)' : 'Invalid Saudi phone (9 digits starting with 5)' });
      return;
    }
    setErrors({});
    setOtpLoading(true);
    setOtpMethod(method);
    try {
      await authApi.sendOtp({ phone: otpPhone, method, lang });
      setOtpSent(true);
      startCountdown();
      toast.success(lang === 'ar' ? 'تم إرسال رمز التحقق' : 'OTP sent successfully');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (lang === 'ar' ? 'فشل إرسال الرمز' : 'Failed to send OTP'));
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP and login
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrors({ otpCode: lang === 'ar' ? 'أدخل رمز التحقق' : 'Enter the verification code' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await loginWithOtp(otpPhone, otpCode);
      toast.success(lang === 'ar' ? 'مرحباً بك!' : 'Welcome!');
      const storedUser = localStorage.getItem('hostn_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const userRole = parsedUser?.role || role;
      const redirect = ROLE_CONFIG[userRole as Role]?.redirect || '/dashboard';
      router.push(redirect);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (lang === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = lang === 'ar' ? 'بريد إلكتروني غير صالح' : 'Invalid email';
    if (!password) newErrors.password = lang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
    else if (!isLogin && password.length < 6) newErrors.password = lang === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters';
    if (!isLogin && !name) newErrors.name = lang === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success(lang === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!');
      } else {
        await register({ name, email, password, phone: phone || undefined, role });
        toast.success(lang === 'ar' ? 'تم إنشاء الحساب!' : 'Account created!');
      }

      const storedUser = localStorage.getItem('hostn_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const userRole = parsedUser?.role || role;
      const redirect = ROLE_CONFIG[userRole as Role]?.redirect || '/dashboard';
      router.push(redirect);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const otherModeLink = isLogin
    ? role === 'admin'
      ? null
      : { href: `/auth/${role}/register`, label: lang === 'ar' ? 'إنشاء حساب جديد' : 'Create an account' }
    : { href: `/auth/${role}/login`, label: lang === 'ar' ? 'لديك حساب؟ سجل دخولك' : 'Already have an account? Sign in' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 inline-block mb-6">
            Hostn
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-gray-500">{subtitle}</p>
        </div>

        {/* Login method toggle (only for admin — guest/host always use phone) */}
        {role === 'admin' && isLogin && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </button>
          </div>
        )}

        {/* Phone + OTP (used for all guest/host auth — both login and register) */}
        {loginMethod === 'phone' && role !== 'admin' ? (
          <form onSubmit={handleOtpLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            {!otpSent ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <div className="flex gap-2" dir="ltr">
                    <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium" dir="ltr">
                      +966
                    </div>
                    <Input
                      type="tel"
                      placeholder="5XXXXXXXX"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      leftIcon={<Phone className="w-4 h-4" />}
                      error={errors.otpPhone}
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => handleSendOtp()}
                  isLoading={otpLoading}
                  className={`w-full ${accent.bg} ${accent.hover} text-white ${accent.ring}`}
                  size="lg"
                >
                  {lang === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-600">
                    {lang === 'ar' ? `تم إرسال رمز التحقق إلى` : 'Verification code sent to'}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1" dir="ltr">+966 {otpPhone}</p>
                </div>
                <Input
                  label={lang === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                  type="text"
                  inputMode="numeric"
                  placeholder="0000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  error={errors.otpCode}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr"
                />
                <Button
                  type="submit"
                  isLoading={loading}
                  className={`w-full ${accent.bg} ${accent.hover} text-white ${accent.ring}`}
                  size="lg"
                >
                  {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className={`${accent.text} font-medium hover:underline`}
                  >
                    {lang === 'ar' ? 'تغيير الرقم' : 'Change number'}
                  </button>
                  {countdown > 0 ? (
                    <span className="text-gray-400">
                      {lang === 'ar' ? `إعادة الإرسال (${countdown}ث)` : `Resend (${countdown}s)`}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSendOtp('sms')}
                        className={`${accent.text} font-medium hover:underline`}
                      >
                        {lang === 'ar' ? 'إعادة عبر SMS' : 'Resend SMS'}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleSendOtp('whatsapp')}
                        className="text-green-600 font-medium hover:underline"
                      >
                        {lang === 'ar' ? 'عبر واتساب' : 'WhatsApp'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {otherModeLink && (
              <p className="text-center text-sm text-gray-500 pt-2">
                <Link href={otherModeLink.href} className={`${accent.text} font-medium hover:underline`}>
                  {otherModeLink.label}
                </Link>
              </p>
            )}
          </form>
        ) : (
          /* Email + Password form (login or register) */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            {!isLogin && (
              <Input
                label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                placeholder={lang === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                error={errors.name}
              />
            )}

            <Input
              label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              type="email"
              placeholder={lang === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email}
            />

            <Input
              label={lang === 'ar' ? 'كلمة المرور' : 'Password'}
              type={showPassword ? 'text' : 'password'}
              placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password}
            />

            {isLogin && (
              <div className="text-right rtl:text-left -mt-2">
                <Link href="/auth/forgot-password" className={`text-sm ${accent.text} hover:underline`}>
                  {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>
            )}

            {!isLogin && (
              <Input
                label={lang === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
                type="tel"
                placeholder="+966 5XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                dir="ltr"
              />
            )}

            <Button
              type="submit"
              isLoading={loading}
              className={`w-full ${accent.bg} ${accent.hover} text-white ${accent.ring}`}
              size="lg"
            >
              {isLogin
                ? lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'
                : lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}
            </Button>

            {otherModeLink && (
              <p className="text-center text-sm text-gray-500">
                <Link href={otherModeLink.href} className={`${accent.text} font-medium hover:underline`}>
                  {otherModeLink.label}
                </Link>
              </p>
            )}
          </form>
        )}

        {/* Back to role selection */}
        <p className="text-center mt-6 text-sm text-gray-400">
          <Link href="/auth" className="hover:text-gray-600 hover:underline">
            {lang === 'ar' ? '← العودة لاختيار نوع الحساب' : '← Back to role selection'}
          </Link>
        </p>
      </div>
    </div>
  );
}
