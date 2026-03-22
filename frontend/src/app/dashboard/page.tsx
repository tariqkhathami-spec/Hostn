'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Booking, Property } from '@/types';
import { bookingsApi, propertiesApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarDays, Home, User, Heart, Star, PlusCircle,
  Clock, CheckCircle2, XCircle, ArrowRight, Settings
} from 'lucide-react';

type TabType = 'overview' | 'bookings' | 'properties' | 'wishlist' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth();
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
    { id: 'overview', label: 'Overview', Icon: Home },
    { id: 'bookings', label: 'Bookings', Icon: CalendarDays, badge: bookings.filter(b => b.status === 'confirmed').length },
    ...(user.role === 'host' ? [{ id: 'properties', label: 'My Properties', Icon: Home }] : []),
    { id: 'wishlist', label: 'Wishlist', Icon: Heart },
    { id: 'profile', label: 'Profile', Icon: User },
  ] as const;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container-custom py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Mobile tab nav */}
            <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
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
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
                  Sign Out
                </button>
              </div>

              {user.role !== 'host' && (
                <Link
                  href="/auth/register?role=host"
                  className="block bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-5 text-center hover:opacity-95 transition-opacity"
                >
                  <div className="text-2xl mb-2">ð </div>
                  <p className="font-bold text-sm">Become a Host</p>
                  <p className="text-xs text-primary-200 mt-1">Earn by listing your space</p>
                </Link>
              )}
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}! ð</h1>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Bookings', value: bookings.length, icon: 'ð', color: 'bg-blue-50' },
                      { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, icon: 'â', color: 'bg-green-50' },
                      { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, icon: 'ð', color: 'bg-amber-50' },
                      { label: 'Wishlisted', value: user.wishlist?.length || 0, icon: 'â¤ï¸', color: 'bg-red-50' },
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-xl sm:rounded-2xl p-3 sm:p-5 ${stat.color}`}>
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{stat.icon}</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent bookings */}
                  <div className="bg-white rounded-2xl shadow-card p-6">
                    <div className="flex justify-between items-center mb-5">
                      <h2 className="font-bold text-gray-900">Recent Bookings</h2>
                      <button onClick={() => setActiveTab('bookings')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                      </div>
                    ) : bookings.slice(0, 3).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No bookings yet.{' '}
                        <Link href="/listings" className="text-primary-600 font-medium hover:underline">Find a stay</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookings.slice(0, 3).map((booking) => (
                          <div key={booking._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                            {booking.property?.images?.[0] && (
                              <div className="relative w-14 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <Image src={booking.property.images[0].url} alt="" fill className="object-cover" unoptimized />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{booking.property?.title}</p>
                              <p className="text-xs text-gray-500">{formatDate(booking.checkIn)} â {formatDate(booking.checkOut)}</p>
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h2>
                  {dataLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">No bookings yet</h3>
                      <p className="text-sm text-gray-500 mb-5">Your booking history will appear here.</p>
                      <Link href="/listings" className="btn-primary inline-flex">Browse Properties</Link>
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
                                <span>ð {formatDate(booking.checkIn)} â {formatDate(booking.checkOut)}</span>
                                <span>ð¥ {booking.guests.adults} guest{booking.guests.adults !== 1 ? 's' : ''}</span>
                                <span className="font-semibold text-gray-700">ð° {formatPrice(booking.pricing.total)}</span>
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
                    <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
                    <Link href="/dashboard/list-property" className="btn-primary inline-flex gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Add Property
                    </Link>
                  </div>
                  {dataLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">No properties listed</h3>
                      <p className="text-sm text-gray-500 mb-5">List your first property and start earning.</p>
                      <Link href="/dashboard/list-property" className="btn-primary inline-flex">Add Your First Property</Link>
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
                              {property.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{property.title}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{property.location.city}</span>
                              <span className="font-semibold text-primary-600">
                                {formatPrice(property.pricing.perNight)}/night
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Properties</h2>
                  {(user.wishlist?.length || 0) === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">No saved properties</h3>
                      <p className="text-sm text-gray-500 mb-5">Click the heart icon on any property to save it here.</p>
                      <Link href="/listings" className="btn-primary inline-flex">Explore Properties</Link>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      You have {user.wishlist?.length} saved propert{user.wishlist?.length !== 1 ? 'ies' : 'y'}.
                      <Link href="/listings" className="text-primary-600 ml-1 hover:underline">Browse more</Link>
                    </p>
                  )}
                </div>
              )}

              {/* Profile tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
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
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Full Name', value: user.name },
                        { label: 'Email', value: user.email },
                        { label: 'Phone', value: user.phone || 'â' },
                        { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString() },
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
                        Edit Profile
                      </button>
                      <button className="btn-outline text-sm sm:text-base">Change Password</button>
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
