'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  User,
  LogOut,
  Home,
  Calendar,
  Heart,
  Settings,
  ChevronDown,
  Globe,
} from 'lucide-react';

const propertyTypes = [
  { label: 'Chalets & Resorts', value: 'chalet', href: '/listings?type=chalet' },
  { label: 'Apartments', value: 'apartment', href: '/listings?type=apartment' },
  { label: 'Villas', value: 'villa', href: '/listings?type=villa' },
  { label: 'Studios', value: 'studio', href: '/listings?type=studio' },
  { label: 'Farms', value: 'farm', href: '/listings?type=farm' },
  { label: 'Camps', value: 'camp', href: '/listings?type=camp' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  const headerBg = isHome && !scrolled
    ? 'bg-transparent border-transparent'
    : 'bg-white/95 backdrop-blur-xl border-gray-100/80 shadow-sm';

  const textColor = isHome && !scrolled ? 'text-white' : 'text-gray-900';
  const linkColor = isHome && !scrolled
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50';
  const activeLink = isHome && !scrolled
    ? 'text-white bg-white/15'
    : 'text-primary-600 bg-primary-50';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${headerBg}`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 md:h-[68px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-premium transition-shadow duration-300">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${textColor}`}>
                Hostn
              </span>
            </Link>

            {/* Nav links â desktop */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {propertyTypes.map((type) => (
                <Link
                  key={type.value}
                  href={type.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === type.href ? activeLink : linkColor
                  }`}
                >
                  {type.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2.5">
              {/* Language toggle */}
              <button
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${linkColor}`}
                title="Language"
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs">EN</span>
              </button>

              {/* Host CTA */}
              {isAuthenticated && user?.role !== 'host' && (
                <Link
                  href="/dashboard/list-property"
                  className={`hidden md:inline-flex text-sm font-semibold rounded-xl px-4 py-2 transition-all duration-300 ${
                    isHome && !scrolled
                      ? 'text-white border border-white/30 hover:bg-white/10'
                      : 'text-primary-600 border border-primary-200 hover:bg-primary-50'
                  }`}
                >
                  Become a Host
                </Link>
              )}

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-300 ${
                      isHome && !scrolled
                        ? 'border border-white/25 hover:bg-white/10'
                        : 'border border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <Menu className={`w-4 h-4 ${isHome && !scrolled ? 'text-white/70' : 'text-gray-600'}`} />
                    <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center ring-2 ring-white/30">
                      <span className="text-white text-xs font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in">
                      <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                        >
                          <Home className="w-4 h-4 text-gray-400" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/bookings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-gray-400" />
                          My Bookings
                        </Link>
                        <Link
                          href="/dashboard/wishlist"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                        >
                          <Heart className="w-4 h-4 text-gray-400" />
                          Wishlist
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Settings
                        </Link>
                        <hr className="my-1.5 border-gray-100" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-red-600 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                      isHome && !scrolled
                        ? 'text-white/90 hover:text-white hover:bg-white/10'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold py-2 px-5 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-sm hover:shadow-premium"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                className={`lg:hidden p-2 rounded-lg transition-colors ${
                  isHome && !scrolled ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 animate-slide-in shadow-lg">
            {propertyTypes.map((type) => (
              <Link
                key={type.value}
                href={type.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                {type.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn-outline text-center text-sm">
                  Sign In
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="btn-primary text-center text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Spacer for fixed header on non-home pages */}
      {!isHome && <div className="h-16 md:h-[68px]" />}

      {/* Backdrop for user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
}
