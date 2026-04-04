'use client';

import Link from 'next/link';
import { useAuth, getRoleRedirect } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { User, LogOut, Globe, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = language as 'en' | 'ar';

  const dashboardLink = isAuthenticated ? getRoleRedirect(user?.role) : '/auth';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary-700">
            Hostn
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">
              {lang === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}
            </Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">
              {lang === 'ar' ? 'المدونة' : 'Blog'}
            </Link>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardLink}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {user?.name?.split(' ')[0]}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                >
                  <LogOut className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-600">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-gray-100 pt-3">
            <Link href="/listings" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-2">
              {lang === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}
            </Link>
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-2">
              {lang === 'ar' ? 'المدونة' : 'Blog'}
            </Link>
            <button onClick={toggleLanguage} className="block text-sm font-medium text-gray-500 py-2">
              <Globe className="w-4 h-4 inline me-1.5" />
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
            {isAuthenticated ? (
              <>
                <Link href={dashboardLink} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-primary-700 py-2">
                  {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="block text-sm font-medium text-red-500 py-2">
                  {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-primary-600 py-2">
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
