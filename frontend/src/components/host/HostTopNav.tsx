'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi } from '@/lib/api';
import { HostNotification } from '@/types';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HostTopNavProps {
  onMenuClick: () => void;
  title?: string;
}

export default function HostTopNav({ onMenuClick, title }: HostTopNavProps) {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isAr = language === 'ar';
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await hostApi.getNotifications();
      setNotifications(res.data.data || []);
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          {title && (
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">{title}</h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {isAr ? 'EN' : 'AR'}
          </button>

          {/* View site link */}
          <Link
            href="/"
            target="_blank"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isAr ? '\u0639\u0631\u0636 \u0627\u0644\u0645\u0648\u0642\u0639' : 'View site'}
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in z-50">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">{isAr ? '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A' : 'Notifications'}</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      {isAr ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062C\u062F\u064A\u062F\u0629' : 'No new notifications'}
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <Link
                        key={n.id}
                        href={n.action}
                        onClick={() => setShowNotifications(false)}
                        className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                            n.type === 'booking_pending'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {n.type === 'booking_pending' ? '\u{1F4C5}' : '\u{2B50}'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-24 truncate">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in z-50">
                <div className="p-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    {isAr ? '\u062D\u0633\u0627\u0628\u064A' : 'My Account'}
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    {isAr ? '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A' : 'Settings'}
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {isAr ? '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click-away */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}
