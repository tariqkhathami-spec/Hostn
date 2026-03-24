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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HostSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function HostSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: HostSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { href: '/host', label: t('host.overview'), icon: LayoutDashboard },
    { href: '/host/listings', label: t('host.listings'), icon: Building2 },
    { href: '/host/bookings', label: t('host.bookings'), icon: BookOpen },
    { href: '/host/calendar', label: t('host.calendar'), icon: CalendarDays },
    { href: '/host/earnings', label: t('host.earnings'), icon: DollarSign },
    { href: '/host/reviews', label: t('host.reviews'), icon: Star },
    { href: '/host/messages', label: t('host.messages'), icon: MessageSquare },
  ];

  const bottomNavItems = [
    { href: '/host/settings', label: t('host.settings'), icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/host') return pathname === '/host';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <Link href="/host" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-gray-900">Hostn</span>
              <span className="block text-[10px] font-semibold text-primary-600 uppercase tracking-wider -mt-0.5">
                {t('host.business')}
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
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
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

        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t('host.backToSite')}</span>}
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
