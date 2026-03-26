'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { User, Home, Shield } from 'lucide-react';

const roles = [
  {
    key: 'guest',
    icon: User,
    href: '/auth/guest/login',
    title: { en: 'Guest', ar: 'ضيف' },
    description: { en: 'Book amazing stays across Saudi Arabia', ar: 'احجز إقامات مذهلة في جميع أنحاء السعودية' },
    accent: 'border-primary-200 hover:border-primary-400 hover:bg-primary-50',
    iconColor: 'text-primary-600 bg-primary-100',
  },
  {
    key: 'host',
    icon: Home,
    href: '/auth/host/login',
    title: { en: 'Host', ar: 'مضيف' },
    description: { en: 'List your property and start earning', ar: 'أدرج عقارك وابدأ بالكسب' },
    accent: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    iconColor: 'text-emerald-600 bg-emerald-100',
  },
  {
    key: 'admin',
    icon: Shield,
    href: '/auth/admin/login',
    title: { en: 'Admin', ar: 'مشرف' },
    description: { en: 'Manage the platform', ar: 'إدارة المنصة' },
    accent: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    iconColor: 'text-violet-600 bg-violet-100',
  },
];

export default function AuthSelectRolePage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Link href="/" className="text-3xl font-bold text-gray-900 inline-block mb-4">
            Hostn
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'ar' ? 'اختر كيف تريد المتابعة' : 'How would you like to continue?'}
          </h1>
          <p className="mt-2 text-gray-500">
            {lang === 'ar' ? 'اختر نوع حسابك للمتابعة' : 'Select your account type to get started'}
          </p>
        </div>

        <div className="space-y-4">
          {roles.map(({ key, icon: Icon, href, title, description, accent, iconColor }) => (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-4 p-5 bg-white rounded-2xl border-2 transition-all duration-200 ${accent}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{title[lang]}</h3>
                <p className="text-sm text-gray-500">{description[lang]}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 hover:underline">
            {lang === 'ar' ? '← العودة للصفحة الرئيسية' : '← Back to home'}
          </Link>
        </p>
      </div>
    </div>
  );
}
