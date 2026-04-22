'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard, Calendar, Home, MessageSquare, Settings,
  CreditCard, Star, BarChart3, Users, Building, BookOpen,
  FileText, Shield, LogOut, ChevronRight, Heart, Wallet, Globe, Newspaper,
  Trophy, ShieldCheck, Award,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, messagesApi } from '@/lib/api';

type BadgeKey = 'bookings' | 'messages' | 'support';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: { en: string; ar: string };
  adminRoles?: ('super' | 'support' | 'finance')[];
  badgeKey?: BadgeKey;
};

const guestNav: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: { en: 'Dashboard', ar: 'لوحة التحكم' } },
  { href: '/dashboard/bookings', icon: BookOpen, label: { en: 'My Bookings', ar: 'حجوزاتي' }, badgeKey: 'bookings' },
  { href: '/dashboard/favorites', icon: Heart, label: { en: 'Favorites', ar: 'المفضلة' } },
  { href: '/dashboard/balance', icon: Wallet, label: { en: 'Balance', ar: 'الرصيد' } },
  { href: '/dashboard/messages', icon: MessageSquare, label: { en: 'Messages', ar: 'الرسائل' }, badgeKey: 'messages' },
  { href: '/dashboard/support', icon: FileText, label: { en: 'Support', ar: 'الدعم' }, badgeKey: 'support' },
  { href: '/dashboard/settings', icon: Settings, label: { en: 'Settings', ar: 'الإعدادات' } },
];

// Host routes are served under business.hostn.co; middleware rewrites
// '/bookings' → '/host/bookings' internally. URLs stay clean (no '/host' prefix).
const hostNav: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: { en: 'Dashboard', ar: 'لوحة التحكم' } },
  { href: '/listings', icon: Building, label: { en: 'My Listings', ar: 'عقاراتي' } },
  { href: '/bookings', icon: BookOpen, label: { en: 'Bookings', ar: 'الحجوزات' }, badgeKey: 'bookings' },
  { href: '/calendar', icon: Calendar, label: { en: 'Calendar', ar: 'التقويم' } },
  { href: '/finance', icon: CreditCard, label: { en: 'Finance', ar: 'المعاملات المالية' } },
  { href: '/reviews', icon: Star, label: { en: 'Reviews', ar: 'التقييمات' } },
  { href: '/unit-points', icon: Trophy, label: { en: 'Unit Points', ar: 'نقاط الوحدات' } },
  { href: '/tourism-license', icon: ShieldCheck, label: { en: 'MOT License', ar: 'رخصة السياحة' } },
  { href: '/loyalty', icon: Award, label: { en: 'Loyalty', ar: 'برنامج الولاء' } },
  { href: '/messages', icon: MessageSquare, label: { en: 'Messages', ar: 'الرسائل' }, badgeKey: 'messages' },
  { href: '/settings', icon: Settings, label: { en: 'Settings', ar: 'الإعدادات' } },
];

const adminNav: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: { en: 'Dashboard', ar: 'لوحة التحكم' } },
  { href: '/admin/users', icon: Users, label: { en: 'Users', ar: 'المستخدمون' }, adminRoles: ['super', 'support'] },
  { href: '/admin/properties', icon: Building, label: { en: 'Properties', ar: 'العقارات' }, adminRoles: ['super', 'support'] },
  { href: '/admin/bookings', icon: BookOpen, label: { en: 'Bookings', ar: 'الحجوزات' }, adminRoles: ['super', 'support', 'finance'] },
  { href: '/admin/payments', icon: CreditCard, label: { en: 'Payments', ar: 'المدفوعات' }, adminRoles: ['super', 'finance'] },
  { href: '/admin/reports', icon: Shield, label: { en: 'Reports', ar: 'البلاغات' }, adminRoles: ['super', 'support'] },
  { href: '/admin/support', icon: FileText, label: { en: 'Support', ar: 'الدعم' }, adminRoles: ['super', 'support'] },
  { href: '/admin/blog', icon: Newspaper, label: { en: 'Blog', ar: 'المدونة' }, adminRoles: ['super'] },
  { href: '/admin/logs', icon: BarChart3, label: { en: 'Activity Logs', ar: 'سجل النشاط' }, adminRoles: ['super', 'support', 'finance'] },
];

const NAV_MAP: Record<string, NavItem[]> = {
  guest: guestNav,
  host: hostNav,
  admin: adminNav,
};

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  guest: { en: 'Guest', ar: 'ضيف' },
  host: { en: 'Host', ar: 'مضيف' },
  admin: { en: 'Admin', ar: 'مشرف' },
};

const ADMIN_ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  super: { en: 'Super Admin', ar: 'مشرف عام' },
  support: { en: 'Support Admin', ar: 'مشرف دعم' },
  finance: { en: 'Finance Admin', ar: 'مشرف مالي' },
};

interface SidebarProps {
  role: 'guest' | 'host' | 'admin';
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();
  const { logout, user } = useAuth();
  const lang = language as 'en' | 'ar';
  const rawNav = NAV_MAP[role] || guestNav;

  // Filter admin nav items by admin sub-role
  const adminRole = (user?.adminRole || 'super') as 'super' | 'support' | 'finance';
  const nav = role === 'admin'
    ? rawNav.filter(item => !item.adminRoles || item.adminRoles.includes(adminRole))
    : rawNav;

  // ── Unread badge counts ──
  const [badges, setBadges] = useState<Record<BadgeKey, number>>({ bookings: 0, messages: 0, support: 0 });

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    try {
      const [summaryRes, msgRes] = await Promise.all([
        notificationsApi.getUnreadSummary().catch(() => null),
        messagesApi.getUnreadCount().catch(() => null),
      ]);
      const s = summaryRes?.data?.data;
      const m = msgRes?.data?.data;
      setBadges({
        bookings: s?.bookings ?? 0,
        support: s?.support ?? 0,
        messages: (m?.count ?? 0) + (s?.messages ?? 0),
      });
    } catch { /* silently ignore */ }
  }, [user]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchBadges]);

  // Clear badge when user navigates to that section
  useEffect(() => {
    if (pathname.startsWith('/dashboard/bookings') || pathname.startsWith('/host/bookings')) {
      setBadges(prev => ({ ...prev, bookings: 0 }));
    } else if (pathname.startsWith('/dashboard/messages') || pathname.startsWith('/host/messages')) {
      setBadges(prev => ({ ...prev, messages: 0 }));
    } else if (pathname.startsWith('/dashboard/support')) {
      setBadges(prev => ({ ...prev, support: 0 }));
    }
  }, [pathname]);

  const isActive = (href: string) => {
    // Roots need exact match to avoid matching every path under them.
    if (href === '/' || href === '/host' || href === '/admin' || href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-e border-gray-200 h-full min-h-screen lg:min-h-0 flex flex-col overflow-y-auto">
      {/* Logo + Role badge */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="text-xl font-bold text-gray-900">Hostn</Link>
        <span className="ms-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
          {role === 'admin' && user?.adminRole
            ? ADMIN_ROLE_LABELS[user.adminRole]?.[lang] || ROLE_LABELS[role]?.[lang]
            : ROLE_LABELS[role]?.[lang] || role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, icon: Icon, label, badgeKey }) => {
          const count = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className="flex-1">{label[lang]}</span>
              {isActive(href) && <ChevronRight className="w-4 h-4 rtl:rotate-180" />}
            </Link>
          );
        })}
      </nav>

      {/* Language + User + Logout */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-sm text-gray-600 mb-3 truncate px-3">{user?.name || user?.email}</div>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 w-full transition-colors mb-1"
        >
          <Globe className="w-5 h-5" />
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-500 w-full transition-colors"
        >
          <LogOut className="w-5 h-5 rtl:rotate-180" />
          {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
