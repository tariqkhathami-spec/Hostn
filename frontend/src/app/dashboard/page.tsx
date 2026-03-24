'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Booking, Property } from '@/types';
import { bookingsApi, propertiesApi, authApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  CalendarDays, Home, User, Heart, Star, PlusCircle,
  Clock, CheckCircle2, XCircle, ArrowRight, Settings,
  BookOpen, Trophy, Users, Save
} from 'lucide-react';

type TabType = 'overview' | 'bookings' | 'properties' | 'wishlist' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Role upgrade state
  const [upgradingRole, setUpgradingRole] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone || '' });
    }
  }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [bookRes, propRes] = await Promise.allSettled([
        bookingsApi.getMyBookings(),
        user?.role === 'host' ? propertiesApi.getMyProperties() : Promise.resolve(null),
      ]);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value?.data?.data || []);
      if (propRes.status === 'fulfilled' && propRes.value) setProperties(propRes.value?.data?.data || []);
    } catch {
      // ignore
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error(language === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
      });
      if (res.data?.data && user) {
        updateUser({ ...user, name: res.data.data.name || profileForm.name, phone: res.data.data.phone || profileForm.phone });
      } else if (user) {
        updateUser({ ...user, name: profileForm.name, phone: profileForm.phone });
      }
      toast.success(language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated');
      setEditingProfile(false);
    } catch {
      toast.error(language === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(language === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed successfully');
      setChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error(language === 'ar' ? 'فشل تغيير كلمة المرور — تأكد من كلمة المرور الحالية' : 'Failed — check your current password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpgradeToHost = async () => {
    setUpgradingRole(true);
    try {
      const res = await authApi.updateProfile({ name: user?.name, phone: user?.phone } as any);
      // Manually send role upgrade
      const upgradeRes = await authApi.updateProfile({ role: 'host' } as any);
      if (user) {
        updateUser({ ...user, role: 'host' });
      }
      toast.success(language === 'ar' ? 'تم ترقية حسابك لمضيف! يمكنك الآن إضافة عقارات.' : 'Upgraded to Host! You can now list properties.');
      router.push('/host/listings/new');
    } catch {
      toast.error(language === 'ar' ? 'فشل ترقية الحساب' : 'Failed to upgrade account');
    } finally {
      setUpgradingRole(false);
    }
  };

  if (isLoading || !user) {
    return (
      <>
        <Header />
        <main className="container-custom py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-48" />
            <div className="h-40 bg-gray-100 rounded-2xl" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    rejected: 'bg-gray-100 text-gray-700',
  };

  const statusLabels: Record<string, string> = language === 'ar' ? {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    cancelled: 'ملغي',
    completed: 'مكتمل',
    rejected: 'مرفوض',
  } : {
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    rejected: 'Rejected',
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'confirmed' || status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === 'cancelled' || status === 'rejected') return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const tabs = [
    { id: 'overview', label: t('dash.overview'), Icon: Home },
    { id: 'bookings', label: t('dash.bookings'), Icon: CalendarDays, badge: bookings.filter(b => b.status === 'confirmed').length },
    ...(user.role === 'host' ? [{ id: 'properties', label: t('dash.myProperties'), Icon: Home }] : []),
    { id: 'wishlist', label: t('dash.wishlist'), Icon: Heart },
    { id: 'profile', label: t('dash.profile'), Icon: User },
  ] as const;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container-custom py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Mobile tab nav */}
            <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {tabs.map(({ id, label, Icon, badge }: { id: string; label: string; Icon: React.ElementType; badge?: number }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as TabType)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === id
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {badge && badge > 0 && (
                      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                        activeTab === id ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-600'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-primary-600 font-bold text-2xl">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-bold text-gray-900">{user.name}</h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <span className={`mt-2 badge text-xs font-semibold ${
                    user.role === 'host' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'host' ? t('dash.roleHost') : t('dash.roleGuest')}
                  </span>
                </div>

                <nav className="space-y-1">
                  {tabs.map(({ id, label, Icon, badge }: { id: string; label: string; Icon: React.ElementType; badge?: number }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as TabType)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        activeTab === id
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        {label}
                      </span>
                      {badge && badge > 0 && (
                        <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                          activeTab === id ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-600'
                        }`}>
                          {badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                <hr className="my-4 border-gray-100" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {t('dash.signOut')}
                </button>
              </div>

              {user.role !== 'host' && (
                <button
                  onClick={handleUpgradeToHost}
                  disabled={upgradingRole}
                  className="w-full block bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-5 text-center hover:opacity-95 transition-opacity disabled:opacity-70"
                >
                  <Home className="w-7 h-7 mx-auto mb-2 text-white/90" />
                  <p className="font-bold text-sm">{t('dash.becomeHost')}</p>
                  <p className="text-xs text-primary-200 mt-1">{t('dash.earnByListing')}</p>
                </button>
              )}
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {t('dash.welcome')} {user.name.split(' ')[0]}!
                  </h1>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: t('dash.totalBookings'), value: bookings.length, Icon: BookOpen, color: 'bg-blue-50', iconColor: 'text-blue-500' },
                      { label: t('dash.confirmed'), value: bookings.filter(b => b.status === 'confirmed').length, Icon: CheckCircle2, color: 'bg-green-50', iconColor: 'text-green-500' },
                      { label: t('dash.completed'), value: bookings.filter(b => b.status === 'completed').length, Icon: Trophy, color: 'bg-amber-50', iconColor: 'text-amber-500' },
                      { label: t('dash.wishlisted'), value: user.wishlist?.length || 0, Icon: Heart, color: 'bg-red-50', iconColor: 'text-red-500' },
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-xl sm:rounded-2xl p-3 sm:p-5 ${stat.color}`}>
                        <stat.Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 ${stat.iconColor}`} />
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent bookings */}
                  <div className="bg-white rounded-2xl shadow-card p-6">
                    <div className="flex justify-between items-center mb-5">
                      <h2 className="font-bold text-gray-900">{t('dash.recentBookings')}</h2>
                      <button onClick={() => setActiveTab('bookings')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                        {t('dash.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                      </div>
                    ) : bookings.slice(0, 3).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {t('dash.noBookings')}{' '}
                        <Link href="/listings" className="text-primary-600 font-medium hover:underline">{t('dash.findStay')}</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookings.slice(0, 3).map((booking) => (
                          <div key={booking._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                            {typeof booking.property === 'object' && booking.property?.images?.[0] && (
                              <div className="relative w-14 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <Image src={booking.property.images[0].url} alt="" fill className="object-cover" unoptimized />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {typeof booking.property === 'object' ? booking.property?.title : ''}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(booking.checkIn)} &ndash; {formatDate(booking.checkOut)}</p>
                            </div>
                            <span className={`badge text-xs font-medium flex items-center gap-1 ${statusColors[booking.status]}`}>
                              <StatusIcon status={booking.status} />
                              {statusLabels[booking.status] || booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bookings tab */}
              {activeTab === 'bookings' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dash.myBookings')}</h2>
                  {dataLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">{t('dash.noBookings')}</h3>
                      <p className="text-sm text-gray-500 mb-5">{t('dash.bookingHistory')}</p>
                      <Link href="/listings" className="btn-primary inline-flex">{t('dash.browseProperties')}</Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div key={booking._id} className="bg-white rounded-2xl shadow-card p-5">
                          <div className="flex gap-4">
                            {typeof booking.property === 'object' && booking.property?.images?.[0] && (
                              <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                <Image src={booking.property.images[0].url} alt="" fill className="object-cover" unoptimized />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 leading-snug">
                                  {typeof booking.property === 'object' ? booking.property?.title : ''}
                                </h3>
                                <span className={`badge text-xs font-medium flex items-center gap-1 flex-shrink-0 ${statusColors[booking.status]}`}>
                                  <StatusIcon status={booking.status} />
                                  {statusLabels[booking.status] || booking.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  {formatDate(booking.checkIn)} &ndash; {formatDate(booking.checkOut)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {booking.guests.adults} {booking.guests.adults !== 1 ? t('dash.guests') : t('dash.guest')}
                                </span>
                                <span className="font-semibold text-gray-700">{formatPrice(booking.pricing.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Host properties tab */}
              {activeTab === 'properties' && user.role === 'host' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{t('dash.myProperties')}</h2>
                    <Link href="/host/listings/new" className="btn-primary inline-flex gap-2">
                      <PlusCircle className="w-4 h-4" />
                      {t('dash.addProperty')}
                    </Link>
                  </div>
                  {dataLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">{t('dash.noProperties')}</h3>
                      <p className="text-sm text-gray-500 mb-5">{t('dash.listFirst')}</p>
                      <Link href="/host/listings/new" className="btn-primary inline-flex">{t('dash.addFirstProperty')}</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {properties.map((property) => (
                        <Link key={property._id} href={`/listings/${property._id}`} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-shadow">
                          <div className="relative h-36">
                            {property.images[0] && (
                              <Image src={property.images[0].url} alt="" fill className="object-cover" unoptimized />
                            )}
                            <span className={`absolute top-3 right-3 badge text-xs ${property.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {property.isActive ? t('dash.active') : t('dash.inactive')}
                            </span>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{property.title}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{property.location.city}</span>
                              <span className="font-semibold text-primary-600">
                                {formatPrice(property.pricing.perNight)}{t('dash.perNight')}
                              </span>
                            </div>
                            {property.ratings.count > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{property.ratings.average.toFixed(1)} ({property.ratings.count})</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Wishlist tab */}
              {activeTab === 'wishlist' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dash.savedProperties')}</h2>
                  {(user.wishlist?.length || 0) === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">{t('dash.noSaved')}</h3>
                      <p className="text-sm text-gray-500 mb-5">{t('dash.clickHeart')}</p>
                      <Link href="/listings" className="btn-primary inline-flex">{t('dash.exploreProperties')}</Link>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      {user.wishlist?.length} {t('dash.savedCount')}.
                      <Link href="/listings" className="text-primary-600 ltr:ml-1 rtl:mr-1 hover:underline">{t('dash.browseMore')}</Link>
                    </p>
                  )}
                </div>
              )}

              {/* Profile tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dash.profileSettings')}</h2>
                  <div className="bg-white rounded-2xl shadow-card p-4 sm:p-6">
                    <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-100">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-bold text-xl sm:text-3xl">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className={`mt-2 badge text-xs inline-block ${user.role === 'host' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>
                          {user.role === 'host' ? t('dash.roleHost') : t('dash.roleGuest')}
                        </span>
                      </div>
                    </div>

                    {!editingProfile && !changingPassword && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: t('dash.fullName'), value: user.name },
                            { label: t('dash.email'), value: user.email },
                            { label: t('dash.phone'), value: user.phone || '\u2014' },
                            { label: t('dash.memberSince'), value: new Date(user.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') },
                          ].map((field) => (
                            <div key={field.label} className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs font-semibold text-gray-500 mb-1">{field.label}</p>
                              <p className="text-sm font-medium text-gray-900">{field.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => setEditingProfile(true)}
                            className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base"
                          >
                            <Settings className="w-4 h-4" />
                            {t('dash.editProfile')}
                          </button>
                          <button
                            onClick={() => setChangingPassword(true)}
                            className="btn-outline text-sm sm:text-base"
                          >
                            {t('dash.changePassword')}
                          </button>
                        </div>
                      </>
                    )}

                    {/* Edit Profile Form */}
                    {editingProfile && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('dash.fullName')}
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full max-w-sm px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('dash.phone')}
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            placeholder="+966 50 000 0000"
                            className="w-full max-w-sm px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile} isLoading={savingProfile} leftIcon={<Save className="w-4 h-4" />}>
                            {language === 'ar' ? 'حفظ' : 'Save'}
                          </Button>
                          <button
                            onClick={() => { setEditingProfile(false); setProfileForm({ name: user.name, phone: user.phone || '' }); }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Change Password Form */}
                    {changingPassword && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">
                          {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                        </h3>
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'كلمة المرور الحالية' : 'Current password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleChangePassword} isLoading={savingPassword}>
                            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                          </Button>
                          <button
                            onClick={() => { setChangingPassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
