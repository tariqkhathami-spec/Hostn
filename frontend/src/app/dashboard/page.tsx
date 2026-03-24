'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Booking, Property } from '@/types';
import { bookingsApi, propertiesApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarDays, Home, User, Heart, Star, PlusCircle,
  Clock, CheckCircle2, XCircle, ArrowRight, Settings,
  BookOpen, Trophy, Users
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
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <tab.Icon className="w-4 h-4" />
                    {tab.label}
                    {'badge' in tab && (tab as { badge?: number }).badge ? (
                      <span className="bg-white/20 text-xs px-1.5 rounded-full">{(tab as { badge?: number }).badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-card p-4 sticky top-24">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <tab.Icon className="w-4 h-4" />
                      {tab.label}
                      {'badge' in tab && (tab as { badge?: number }).badge ? (
                        <span className="ltr:ml-auto rtl:mr-auto bg-primary-100 text-primary-600 text-xs px-2 py-0.5 rounded-full">{(tab as { badge?: number }).badge}</span>
                      ) : null}
                    </button>
                  ))}
                </nav>

                {user.role !== 'host' && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl">
                    <Trophy className="w-8 h-8 text-primary-600 mb-2" />
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">{t('dash.becomeHost')}</h4>
                    <p className="text-xs text-gray-600 mb-3">{t('dash.earnByListing')}</p>
                    <Link href="/auth/register?role=host" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      {t('dash.becomeHost')} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                <button
                  onClick={logout}
                  className="w-full mt-4 flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  {t('dash.signOut')}
                </button>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Overview tab */}
              {activeTab === 'overview' && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    {t('dash.welcome')} {user.name.split(' ')[0]}
                  </h1>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    {[
                      { label: t('dash.totalBookings'), value: bookings.length, Icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
                      { label: t('dash.confirmed'), value: bookings.filter(b => b.status === 'confirmed').length, Icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
                      { label: t('dash.completed'), value: bookings.filter(b => b.status === 'completed').length, Icon: BookOpen, color: 'bg-purple-50 text-purple-600' },
                      { label: t('dash.wishlisted'), value: user.wishlist?.length || 0, Icon: Heart, color: 'bg-rose-50 text-rose-600' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white rounded-2xl shadow-card p-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                          <stat.Icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent bookings */}
                  <div className="bg-white rounded-2xl shadow-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{t('dash.recentBookings')}</h3>
                      {bookings.length > 0 && (
                        <button onClick={() => setActiveTab('bookings')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                          {t('dash.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {dataLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-3">{t('dash.noBookings')}</p>
                        <Link href="/listings" className="text-sm text-primary-600 font-medium hover:text-primary-700">{t('dash.findStay')}</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookings.slice(0, 5).map((booking) => (
                          <div key={booking._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{booking.property?.title}</p>
                              <p className="text-xs text-gray-500">{formatDate(booking.checkIn)} &ndash; {formatDate(booking.checkOut)}</p>
                            </div>
                            <span className={`badge text-xs font-medium flex items-center gap-1 ${statusColors[booking.status]}`}>
                              <StatusIcon status={booking.status} />
                              {booking.status}
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
                            {booking.property?.images?.[0] && (
                              <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                <Image src={booking.property.images[0].url} alt="" fill className="object-cover" unoptimized />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 leading-snug">{booking.property?.title}</h3>
                                <span className={`badge text-xs font-medium flex items-center gap-1 flex-shrink-0 ${statusColors[booking.status]}`}>
                                  <StatusIcon status={booking.status} />
                                  {booking.status}
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
                    <Link href="/dashboard/list-property" className="btn-primary inline-flex gap-2">
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
                      <Link href="/dashboard/list-property" className="btn-primary inline-flex">{t('dash.addFirstProperty')}</Link>
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
                      <button className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base">
                        <Settings className="w-4 h-4" />
                        {t('dash.editProfile')}
                      </button>
                      <button className="btn-outline text-sm sm:text-base">{t('dash.changePassword')}</button>
                    </div>
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
