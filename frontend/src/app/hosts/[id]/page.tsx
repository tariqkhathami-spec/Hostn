'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/listings/PropertyCard';
import StarRating from '@/components/ui/StarRating';
import { publicHostApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Property, User } from '@/types';
import { BadgeCheck, Share2, Building2, Clock, CalendarDays, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface HostReview {
  _id: string;
  ratings: { overall: number };
  comment: string;
  createdAt: string;
  guest: { _id: string; name: string; avatar?: string };
  property: { _id: string; title: string };
}

interface HostData {
  host: { _id: string; name: string; avatar?: string; createdAt: string; isVerified: boolean };
  stats: { propertyCount: number; averageRating: number; totalReviews: number; memberSince: number };
  reviews: HostReview[];
  reviewsPagination: { total: number; page: number; pages: number };
  properties: Property[];
  propertiesPagination: { total: number; page: number; pages: number };
}

export default function HostProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [data, setData] = useState<HostData | null>(null);
  const [loading, setLoading] = useState(true);
  usePageTitle(data ? data.host.name : (isAr ? 'المضيف' : 'Host'));
  const [activeTab, setActiveTab] = useState<'reviews' | 'properties'>('reviews');
  const [reviewPage, setReviewPage] = useState(1);
  const [propertyPage, setPropertyPage] = useState(1);

  const fetchData = async (rp = 1, pp = 1) => {
    try {
      const res = await publicHostApi.getProfile(id, { reviewPage: rp, reviewLimit: 10, propertyPage: pp, propertyLimit: 6 });
      setData(res.data.data);
    } catch {
      // 404 or error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [id]);

  const handleReviewPageChange = async (page: number) => {
    setReviewPage(page);
    try {
      const res = await publicHostApi.getProfile(id, { reviewPage: page, reviewLimit: 10, propertyPage, propertyLimit: 6 });
      setData(res.data.data);
    } catch { /* ignore */ }
  };

  const handlePropertyPageChange = async (page: number) => {
    setPropertyPage(page);
    try {
      const res = await publicHostApi.getProfile(id, { reviewPage, reviewLimit: 10, propertyPage: page, propertyLimit: 6 });
      setData(res.data.data);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = data?.host.name || 'Host';
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container-custom py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
            </div>
            <div className="h-64 bg-gray-100 rounded-xl" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />
        <main className="container-custom py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{isAr ? 'المضيف غير موجود' : 'Host not found'}</h1>
          <p className="text-gray-500">{isAr ? 'ربما تم حذف هذا الحساب أو لم يعد متاحاً.' : 'This host may not exist or is no longer available.'}</p>
          <Link href="/listings" className="btn-primary inline-flex mt-6">{isAr ? 'تصفح العقارات' : 'Browse Properties'}</Link>
        </main>
        <Footer />
      </>
    );
  }

  const { host, stats, reviews, reviewsPagination, properties, propertiesPagination } = data;

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container-custom py-8">
          {/* Header with share */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{isAr ? 'عن المضيف' : 'About the Host'}</h1>
            <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Share2 className="w-4 h-4" />
              {isAr ? 'مشاركة' : 'Share'}
            </button>
          </div>

          {/* Banner */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white/30">
                {host.avatar ? (
                  <img src={host.avatar} alt={host.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-3xl">
                    {host.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {host.name}
                  {host.isVerified && <BadgeCheck className="w-6 h-6 text-white" />}
                </h2>
                {stats.averageRating > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{stats.averageRating.toFixed(1)}</span>
                    <span className="text-white/70">({stats.totalReviews} {isAr ? 'تقييم' : 'reviews'})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <Clock className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">{isAr ? 'خلال ساعات' : 'Few hours'}</div>
              <div className="text-xs text-gray-500">{isAr ? 'متوسط وقت الاستجابة' : 'Avg. response time'}</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <Building2 className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">{stats.propertyCount}</div>
              <div className="text-xs text-gray-500">{isAr ? 'عدد الوحدات' : 'Properties'}</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <CalendarDays className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">{stats.memberSince}</div>
              <div className="text-xs text-gray-500">{isAr ? 'مضيف على Hostn منذ' : 'Host on Hostn since'}</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <Star className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}</div>
              <div className="text-xs text-gray-500">{isAr ? 'التقييم' : 'Rating'}</div>
            </div>
          </div>

          {/* Segmented buttons */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {isAr ? 'التقييمات' : 'Reviews'} ({stats.totalReviews})
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                activeTab === 'properties'
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {isAr ? 'العقارات' : 'Properties'} ({stats.propertyCount})
            </button>
          </div>

          {/* Reviews tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-12">{isAr ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p>
              ) : (
                <>
                  {reviews.map((review) => (
                    <div key={review._id} className="bg-white border border-gray-100 rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {review.guest.avatar ? (
                            <img src={review.guest.avatar} alt={review.guest.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-primary-600 font-bold text-sm">
                              {review.guest.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{review.guest.name}</span>
                            <StarRating rating={review.ratings.overall} size="sm" />
                          </div>
                          <p className="text-xs text-gray-400 mb-2">
                            {review.property?.title && (
                              <Link href={`/listings/${review.property._id}`} className="hover:text-primary-600">{review.property.title}</Link>
                            )}
                            {' · '}
                            {new Date(review.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reviews pagination */}
                  {reviewsPagination.pages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      {Array.from({ length: reviewsPagination.pages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleReviewPageChange(p)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                            p === reviewsPagination.page
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Properties tab */}
          {activeTab === 'properties' && (
            <div>
              {properties.length === 0 ? (
                <p className="text-gray-500 text-center py-12">{isAr ? 'لا توجد عقارات' : 'No properties yet'}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop) => (
                      <PropertyCard key={prop._id} property={prop} />
                    ))}
                  </div>

                  {/* Properties pagination */}
                  {propertiesPagination.pages > 1 && (
                    <div className="flex justify-center gap-2 pt-8">
                      {Array.from({ length: propertiesPagination.pages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePropertyPageChange(p)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                            p === propertiesPagination.page
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
