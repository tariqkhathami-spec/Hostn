'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/property/ImageGallery';
import AmenitiesList from '@/components/property/AmenitiesList';
import ReviewsList from '@/components/property/ReviewsList';
import BookingWidget from '@/components/property/BookingWidget';
import { Unit, Property, User, AmenityType, PropertyImage } from '@/types';
import { unitsApi, propertiesApi, publicHostApi } from '@/lib/api';
import { getPropertyTypeLabel } from '@/lib/utils';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { MapPin, Users, BedDouble, Bath, Clock, Cigarette, PawPrint, Music, BadgeCheck, Share2, Heart, ClipboardList, Star, MapPinned, ScrollText, ShieldCheck, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';

const PropertyMap = dynamic(() => import('@/components/maps/PropertyMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-100 rounded-xl animate-pulse" />,
});
import StarRating from '@/components/ui/StarRating';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { getSearchCookies } from '@/lib/searchCookies';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <UnitDetailContent />
    </Suspense>
  );
}

/** Map cancellation policy key to human-readable labels */
function getCancellationLabel(policy: string | undefined, isAr: boolean): string {
  const labels: Record<string, { en: string; ar: string }> = {
    free: { en: 'Free cancellation', ar: 'إلغاء مجاني' },
    flexible: { en: 'Flexible cancellation', ar: 'إلغاء مرن' },
    normal: { en: 'Standard cancellation', ar: 'إلغاء عادي' },
    restricted: { en: 'Restricted cancellation', ar: 'إلغاء مقيد' },
  };
  if (!policy) return isAr ? 'غير محدد' : 'Not specified';
  const entry = labels[policy];
  return entry ? (isAr ? entry.ar : entry.en) : policy;
}

function UnitDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const { t, language } = useLanguage();
  const { user, isAuthenticated, toggleWishlist } = useAuth();
  const isAr = language === 'ar';

  // Extract the populated property from the unit
  const property = unit?.property && typeof unit.property === 'object' ? (unit.property as Property) : null;
  const host = property?.host && typeof property.host === 'object' ? (property.host as User) : null;

  // Display title: unit name (bilingual), with property name as subtitle
  const displayTitle = unit
    ? (isAr && unit.nameAr ? unit.nameAr : unit.nameEn) || (isAr ? 'وحدة بدون اسم' : 'Unnamed unit')
    : '';
  const propertyTitle = property
    ? (isAr && property.titleAr ? property.titleAr : property.title)
    : '';

  usePageTitle(displayTitle || (isAr ? 'تفاصيل الوحدة' : 'Unit Details'));

  // Wishlist state (still tied to property)
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Host stats from public API
  const [hostStats, setHostStats] = useState<{ propertyCount: number; averageRating: number; totalReviews: number } | null>(null);

  // Segmented nav active section
  const [activeSection, setActiveSection] = useState('specification');

  // Read dates and guests from cookies
  const [initialCheckIn, setInitialCheckIn] = useState('');
  const [initialCheckOut, setInitialCheckOut] = useState('');
  const [initialAdults, setInitialAdults] = useState(0);
  const [initialChildren, setInitialChildren] = useState(0);

  useEffect(() => {
    const saved = getSearchCookies();
    if (saved) {
      if (saved.checkIn) setInitialCheckIn(saved.checkIn);
      if (saved.checkOut) setInitialCheckOut(saved.checkOut);
      if (saved.adults) setInitialAdults(saved.adults);
      if (saved.children) setInitialChildren(saved.children);
    }
  }, []);

  useEffect(() => {
    const fetchUnit = async () => {
      try {
        // First, try to load as a unit
        const res = await unitsApi.getOne(id);
        setUnit(res.data.data);
      } catch {
        // If unit not found, try loading as a property → show first active unit
        try {
          const propRes = await propertiesApi.getOne(id);
          const property = propRes.data.data;
          if (property) {
            // Fetch the first active unit for this property
            const unitsRes = await unitsApi.getForProperty(id);
            const units = unitsRes.data.data || [];
            if (units.length > 0) {
              // Load the full unit data for the first unit
              const unitRes = await unitsApi.getOne(units[0]._id);
              setUnit(unitRes.data.data);
            }
            // If property exists but has no units, leave unit as null (shows "not found")
          }
        } catch {
          // Neither unit nor property found
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUnit();
  }, [id]);

  // Track wishlist state (still uses property._id)
  useEffect(() => {
    if (property) setIsWishlisted(user?.wishlist?.includes(property._id) ?? false);
  }, [user?.wishlist, property]);

  // Fetch host stats
  useEffect(() => {
    if (!host?._id) return;
    publicHostApi.getProfile(host._id, { propertyLimit: 0, reviewLimit: 0 })
      .then(res => setHostStats(res.data.data.stats))
      .catch(() => {});
  }, [host]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = displayTitle || 'Hostn';
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated || !property) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }
    setWishlistLoading(true);
    try {
      await toggleWishlist(property._id);
      const newState = !isWishlisted;
      setIsWishlisted(newState);
      toast.success(newState
        ? (isAr ? 'تم الحفظ في المفضلة' : 'Saved to wishlist')
        : (isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist'));
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Something went wrong');
    } finally {
      setWishlistLoading(false);
    }
  };

  // ── Images: prefer unit images, fallback to property images ──
  const galleryImages: PropertyImage[] = (() => {
    if (unit?.images && unit.images.length > 0) {
      return unit.images.map(img => ({
        url: img.url,
        caption: img.caption,
        isPrimary: img.isPrimary ?? false,
      }));
    }
    if (property?.images && property.images.length > 0) return property.images;
    return [{ url: '/placeholder-property.jpg', isPrimary: true }];
  })();

  // ── Amenities: cast string[] to AmenityType[] ──
  const unitAmenities: AmenityType[] = (unit?.amenities ?? []) as AmenityType[];

  // ── Ratings: from property (units don't have reviews yet) ──
  const ratings = property?.ratings;

  if (loading) {
    return (
      <>
        <Header />
        <main className="container-custom py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-2xl mb-8" />
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-32 bg-gray-100 rounded" />
              </div>
              <div className="h-80 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!unit || !property) {
    return (
      <>
        <Header />
        <main className="container-custom py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{t('property.notFound')}</h1>
          <p className="text-gray-500">{isAr ? 'ربما تم حذف هذه الوحدة أو لم تعد متاحة.' : 'This unit may have been removed or is no longer available.'}</p>
          <a href="/search" className="btn-primary inline-flex mt-6">{t('property.browseProperties')}</a>
        </main>
        <Footer />
      </>
    );
  }

  // ── Discount badge: from unit pricing ──
  const discountPercent = (unit.pricing as Record<string, number> | undefined)?.discountPercent ?? 0;

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container-custom py-8">
          {/* Breadcrumb: Home > Search > City > Unit Name */}
          <nav className="text-sm text-gray-500 mb-4">
            <a href="/" className="hover:text-primary-600">{t('breadcrumb.home')}</a>
            <span className="mx-2">/</span>
            <a href="/search" className="hover:text-primary-600">{t('breadcrumb.properties')}</a>
            <span className="mx-2">/</span>
            <a href={`/search?city=${property.location.city}`} className="hover:text-primary-600">
              {isAr ? (CITIES.find(c => c.value.toLowerCase() === property.location.city.toLowerCase())?.ar || property.location.city) : property.location.city}
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-800 line-clamp-1">{displayTitle}</span>
          </nav>

          {/* Title — unit name as main, property name as subtitle */}
          <div className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{displayTitle}</h1>
                {propertyTitle && (
                  <p className="text-base text-gray-500 mb-2">{propertyTitle}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {ratings && ratings.count > 0 && (
                    <StarRating rating={ratings.average} count={ratings.count} size="md" />
                  )}
                  <span className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    {property.location.district && `${isAr ? (Object.values(DISTRICTS).flat().find(d => d.value === property.location.district)?.ar || property.location.district) : property.location.district}, `}{isAr ? (CITIES.find(c => c.value.toLowerCase() === property.location.city.toLowerCase())?.ar || property.location.city) : property.location.city}
                  </span>
                  <span className="badge bg-primary-50 text-primary-700 text-xs font-semibold">
                    {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {discountPercent > 0 && (
                  <span className="badge bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1.5">
                    🎉 {isAr ? `خصم ${discountPercent}%` : `${discountPercent}% Discount`}
                  </span>
                )}
                <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={isAr ? 'مشاركة' : 'Share'}>
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={handleWishlistToggle} disabled={wishlistLoading} className="group/heart p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50" title={isAr ? 'المفضلة' : 'Wishlist'}>
                  <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover/heart:fill-red-500 group-hover/heart:text-red-500'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Image gallery — unit images with fallback */}
          <div className="mb-8">
            <ImageGallery images={galleryImages} title={displayTitle} />
          </div>

          {/* Segmented navigation — tab/pill style */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 -mx-4 px-4 mb-6">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 w-full overflow-x-auto no-scrollbar">
              {[
                { id: 'specification', label: isAr ? 'المواصفات' : 'Specification', Icon: ClipboardList },
                { id: 'reviews', label: isAr ? 'التقييمات' : 'Reviews', Icon: Star },
                { id: 'location', label: isAr ? 'الموقع' : 'Location', Icon: MapPinned },
                { id: 'terms', label: isAr ? 'الشروط' : 'Terms', Icon: ScrollText },
              ].map(({ id: sId, label, Icon }) => (
                <button
                  key={sId}
                  onClick={() => setActiveSection(sId)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-0 ${
                    activeSection === sId
                      ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">

              {/* ── Tab: Specification ── */}
              {activeSection === 'specification' && (
                <>
                  {/* Quick stats — from unit data */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { Icon: Users, label: t('property.maxGuests'), value: unit.capacity?.maxGuests ?? '—' },
                      { Icon: BedDouble, label: t('property.bedrooms'), value: unit.bedrooms?.count ?? '—' },
                      { Icon: Bath, label: t('property.bathrooms'), value: unit.bathroomCount ?? '—' },
                      { Icon: BedDouble, label: t('property.beds'), value: ((unit.bedrooms?.singleBeds ?? 0) + (unit.bedrooms?.doubleBeds ?? 0)) || '—' },
                    ].map(({ Icon, label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
                        <Icon className="w-5 h-5 text-primary-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-gray-900">{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Host info — from property.host */}
                  {host && typeof host === 'object' && (
                    <Link href={`/hosts/${host._id}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {host.avatar ? (
                          <img src={host.avatar} alt={host.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-primary-600 font-bold text-lg">
                            {host.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5 group-hover:text-primary-600">
                          {t('property.hostedBy')} {host.name}
                          {host.isVerified && (
                            <BadgeCheck className="w-4 h-4 text-primary-600" />
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span>{isAr ? `مضيف منذ ${new Date(host.createdAt).getFullYear()}` : `Host since ${new Date(host.createdAt).getFullYear()}`}</span>
                          {hostStats && hostStats.averageRating > 0 && (
                            <StarRating rating={hostStats.averageRating} count={hostStats.totalReviews} size="sm" />
                          )}
                          {hostStats && (
                            <span>{isAr ? `${hostStats.propertyCount} عقارات` : `${hostStats.propertyCount} properties`}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Description — from unit */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.aboutThisPlace')}</h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {unit.description || (isAr ? 'لا يوجد وصف متاح.' : 'No description available.')}
                    </p>
                  </div>

                  {/* Suitability */}
                  {unit.suitability && (
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-2">{isAr ? 'مناسبة لـ' : 'Suitable for'}</h2>
                      <p className="text-gray-600">{unit.suitability}</p>
                    </div>
                  )}

                  {/* Amenities — from unit */}
                  {unitAmenities.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {t('property.whatThisPlaceOffers')}
                      </h2>
                      <AmenitiesList amenities={unitAmenities} showAll={showAllAmenities} />
                      {unitAmenities.length > 10 && (
                        <button
                          onClick={() => setShowAllAmenities(!showAllAmenities)}
                          className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700 underline"
                        >
                          {showAllAmenities ? t('property.showLess') : `${t('property.showAll')} (${unitAmenities.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Features — from unit */}
                  {unit.features && unit.features.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'المميزات' : 'Features'}</h2>
                      <div className="flex flex-wrap gap-2">
                        {unit.features.map((feature) => (
                          <span key={feature} className="badge bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Reviews — still uses property._id ── */}
              {activeSection === 'reviews' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.guestReviews')}</h2>
                  <ReviewsList
                    propertyId={property._id}
                    averageRating={ratings?.average ?? 0}
                    reviewCount={ratings?.count ?? 0}
                  />
                </div>
              )}

              {/* ── Tab: Location & Map — from property ── */}
              {activeSection === 'location' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'الموقع والخريطة' : 'Location & Map'}</h2>
                  {property.location.coordinates?.lat && property.location.coordinates?.lng ? (
                    <>
                      <PropertyMap
                        lat={property.location.coordinates.lat}
                        lng={property.location.coordinates.lng}
                        title={displayTitle}
                        className="h-[350px] rounded-xl"
                        isApproximate={(property.location as { isApproximate?: boolean }).isApproximate}
                      />
                      {(property.location as { isApproximate?: boolean }).isApproximate && (
                        <p className="mt-3 text-sm text-gray-500 italic flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {isAr ? 'سيتم عرض الموقع الدقيق بعد تأكيد الحجز' : 'Exact location shown after booking confirmation'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">{isAr ? 'لم يتم تحديد الموقع على الخريطة' : 'Location not available on map'}</p>
                  )}
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      {property.location.district && `${isAr ? (Object.values(DISTRICTS).flat().find(d => d.value === property.location.district)?.ar || property.location.district) : property.location.district}, `}{isAr ? (CITIES.find(c => c.value.toLowerCase() === property.location.city.toLowerCase())?.ar || property.location.city) : property.location.city}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Tab: Terms & Policies — unit cancellation + written rules, with property rules fallback ── */}
              {activeSection === 'terms' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.houseRules')}</h2>

                  {/* Cancellation policy — from unit */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">{isAr ? 'سياسة الإلغاء' : 'Cancellation Policy'}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{getCancellationLabel(unit.cancellationPolicy, isAr)}</p>
                    {unit.cancellationDescription && (
                      <p className="text-sm text-gray-500 mt-1">{unit.cancellationDescription}</p>
                    )}
                  </div>

                  {/* Written rules — from unit */}
                  {unit.writtenRules && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <h3 className="font-semibold text-gray-900">{isAr ? 'قواعد الوحدة' : 'Unit Rules'}</h3>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{unit.writtenRules}</p>
                    </div>
                  )}

                  {/* Property rules (legacy fallback) */}
                  {property.rules && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">{isAr ? 'قواعد العقار' : 'Property Rules'}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          property.rules.checkInTime && {
                            Icon: Clock,
                            label: t('property.checkIn'),
                            value: isAr ? `بعد ${property.rules.checkInTime}` : `After ${property.rules.checkInTime}`,
                          },
                          property.rules.checkOutTime && {
                            Icon: Clock,
                            label: t('property.checkOut'),
                            value: isAr ? `قبل ${property.rules.checkOutTime}` : `Before ${property.rules.checkOutTime}`,
                          },
                          property.rules.smokingAllowed !== undefined && {
                            Icon: Cigarette,
                            label: t('property.smoking'),
                            value: property.rules.smokingAllowed ? t('property.allowed') : t('property.notAllowed'),
                          },
                          property.rules.petsAllowed !== undefined && {
                            Icon: PawPrint,
                            label: t('property.pets'),
                            value: property.rules.petsAllowed ? t('property.allowed') : t('property.notAllowed'),
                          },
                          property.rules.partiesAllowed !== undefined && {
                            Icon: Music,
                            label: t('property.parties'),
                            value: property.rules.partiesAllowed ? t('property.allowed') : t('property.notAllowed'),
                          },
                        ].filter(Boolean).map((item) => {
                          const { Icon, label, value } = item as { Icon: typeof Clock; label: string; value: string };
                          return (
                            <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <Icon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                <span className="font-medium">{label}:</span> {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right column – Booking widget (still receives property for backward compat) */}
            <div className="lg:col-span-1">
              <BookingWidget property={property} initialCheckIn={initialCheckIn} initialCheckOut={initialCheckOut} initialAdults={initialAdults} initialChildren={initialChildren} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
