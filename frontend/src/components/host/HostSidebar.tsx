'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BookOpen,
  DollarSign,
  Star,
  MessageSquare,
  ArrowLeft,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Tag,
  Trophy,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HostSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// Host routes are served under business.hostn.co; middleware rewrites
// '/listings' → '/host/listings' internally. URLs stay clean (no '/host' prefix).
function getNavItems(isAr: boolean) {
  return [
    { href: '/', label: isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview', icon: LayoutDashboard },
    { href: '/listings', label: isAr ? '\u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A' : 'Listings', icon: Building2 },
    { href: '/bookings', label: isAr ? '\u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A' : 'Bookings', icon: BookOpen },
    { href: '/calendar', label: isAr ? '\u0627\u0644\u062A\u0642\u0648\u064A\u0645' : 'Calendar', icon: CalendarDays },
    { href: '/pricing', label: isAr ? '\u0627\u0644\u0623\u0633\u0639\u0627\u0631' : 'Pricing', icon: Tag },
    { href: '/finance', label: isAr ? '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629' : 'Finance', icon: DollarSign },
    { href: '/reviews', label: isAr ? '\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A' : 'Reviews', icon: Star },
    { href: '/unit-points', label: isAr ? 'نقاط الوحدات' : 'Unit Points', icon: Trophy },
    { href: '/tourism-license', label: isAr ? 'رخصة السياحة' : 'MOT License', icon: ShieldCheck },
    { href: '/loyalty', label: isAr ? 'برنامج الولاء' : 'Loyalty', icon: Award },
    { href: '/messages', label: isAr ? '\u0627\u0644\u0631\u0633\u0627\u0626\u0644' : 'Messages', icon: MessageSquare },
  ];
}

function getBottomNavItems(isAr: boolean) {
  return [
    { href: '/settings', label: isAr ? '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A' : 'Settings', icon: Settings },
  ];
}

export default function HostSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: HostSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isAr = language === 'ar';
  const navItems = getNavItems(isAr);
  const bottomNavItems = getBottomNavItems(isAr);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-gray-900">Hostn</span>
              <span className="block text-[10px] font-semibold text-primary-600 uppercase tracking-wider -mt-0.5">
                {isAr ? '\u0627\u0644\u0623\u0639\u0645\u0627\u0644' : 'Business'}
              </span>
            </div>
          )}
        </Link>
        {/* Mobile close */}
        <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
        {/* Desktop toggle */}
        <button
          onClick={onToggle}
          className="hidden lg:flex w-7 h-7 bg-gray-100 rounded-lg items-center justify-center hover:bg-gray-200 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500 rtl:rotate-180" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-gray-500 rtl:rotate-180" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              isActive(href)
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon
              className={cn(
                'w-[18px] h-[18px] flex-shrink-0',
                isActive(href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        {bottomNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              isActive(href)
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <Icon
              className={cn(
                'w-[18px] h-[18px] flex-shrink-0',
                isActive(href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full"
        >
          <Globe className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{isAr ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064A\u0629'}</span>}
        </button>

        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0 rtl:rotate-180" />
          {!collapsed && <span>{isAr ? '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0645\u0648\u0642\u0639' : 'Back to site'}</span>}
        </Link>

        {/* User */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-3 mt-2 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen bg-white border-r border-gray-200 sticky top-0 transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
