'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react';
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
  const { login, register } = useAuth();
  const { language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const config = ROLE_CONFIG[role];
  const accent = ACCENT_CLASSES[config.accent as keyof typeof ACCENT_CLASSES];
  const isLogin = mode === 'login';
  const lang = language as 'en' | 'ar';

  const title = isLogin ? config.loginTitle[lang] : config.registerTitle[lang];
  const subtitle = isLogin ? config.loginSubtitle[lang] : config.registerSubtitle[lang];

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

      // Read role from stored user for redirect
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

        {/* Form */}
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

          {!isLogin && (
            <Input
              label={lang === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
              type="tel"
              placeholder="+966 5XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
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
