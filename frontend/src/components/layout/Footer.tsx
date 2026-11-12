'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import { hostPortalUrl } from '@/lib/hostPortal';

export default function Footer() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const lang = language as 'en' | 'ar';

  return (
    <footer className="bg-primary-950 text-primary-200/80 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4"><Logo tone="light" size={34} /></div>
            <p className="text-sm leading-relaxed">
              {lang === 'ar'
                ? 'منصة سعودية لحجز الشاليهات والاستراحات والمزارع، بأسعار واضحة وعقارات موثّقة.'
                : 'A Saudi platform for booking chalets, rest houses and farms — verified stays, clear prices.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-white transition-colors">{lang === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">{lang === 'ar' ? 'المدونة' : 'Blog'}</Link></li>
              <li><a href={hostPortalUrl('/auth')} className="hover:text-white transition-colors">{lang === 'ar' ? 'اعرض عقارك' : 'List your property'}</a></li>
              <li>
                {isAuthenticated ? (
                  <Link href="/dashboard" className="hover:text-white transition-colors">{lang === 'ar' ? 'حسابي' : 'My Account'}</Link>
                ) : (
                  <Link href="/auth" className="hover:text-white transition-colors">{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</Link>
                )}
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              {lang === 'ar' ? 'الدعم' : 'Support'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">{lang === 'ar' ? 'مركز المساعدة' : 'Help Center'}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              {lang === 'ar' ? 'قانوني' : 'Legal'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms-of-use" className="hover:text-white transition-colors">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} Hostn. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
}
