'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/property/ImageGallery';
import AmenitiesList from '@/components/property/AmenitiesList';
import ReviewsList from '@/components/property/ReviewsList';
import BookingWidget from '@/components/property/BookingWidget';
import { Unit, Property, User, AmenityType, PropertyImage, WishlistList } from '@/types';
import { unitsApi, propertiesApi, publicHostApi, wishlistsApi } from '@/lib/api';
import { getPropertyTypeLabel, getAmenityLabel, getAmenityIcon } from '@/lib/utils';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { MapPin, Users, BedDouble, Bath, Clock, Cigarette, PawPrint, Music, BadgeCheck, Share2, Heart, ClipboardList, Star, MapPinned, ScrollText, ShieldCheck, FileText, Plus, Loader2, X, Check, Trash2 } from 'lucide-react';
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
import { createPortal } from 'react-dom';
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
  const { user, isAuthenticated } = useAuth();
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

  // Wishlist state (property-based)
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Wishlist list picker state
  const [showListPicker, setShowListPicker] = useState(false);
  const [lists, setLists] = useState<WishlistList[]>([]);
  const [memberListIds, setMemberListIds] = useState<Set<string>>(new Set());
  const [listsLoading, setListsLoading] = useState(false);
  const [togglingList, setTogglingList] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);

  // Host stats from public API
  const [hostStats, setHostStats] = useState<{ propertyCount: number; averageRating: number; totalReviews: number } | null>(null);

  // Segmented nav — tab switching
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
          const propData = propRes.data.data;
          if (propData) {
            const unitsRes = await unitsApi.getForProperty(id);
            const units = unitsRes.data.data || [];
            if (units.length > 0) {
              const unitRes = await unitsApi.getOne(units[0]._id);
              setUnit(unitRes.data.data);
            }
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

  // Track wishlist state (uses property._id)
  const propertyId = property?._id || '';
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

  // ── Wishlist picker logic (same pattern as UnitCard) ──
  const openListPicker = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !propertyId) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }
    if (heartRef.current) {
      const rect = heartRef.current.getBoundingClientRect();
      const pickerW = 260;
      const gap = 8;
      let left = isAr ? rect.left : rect.right - pickerW;
      left = Math.max(gap, Math.min(left, window.innerWidth - pickerW - gap));
      setPickerStyle({
        position: 'fixed',
        top: rect.bottom + gap,
        left,
        maxHeight: window.innerHeight - rect.bottom - gap * 2,
        zIndex: 9999,
      });
    }
    setShowListPicker(true);
    setListsLoading(true);
    try {
      const [listsRes, memberRes] = await Promise.all([
        wishlistsApi.getLists(),
        wishlistsApi.getPropertyMembership(propertyId),
      ]);
      setLists(listsRes.data.data || []);
      setMemberListIds(new Set(memberRes.data.data || []));
    } catch {
      toast.error(isAr ? 'فشل تحميل القوائم' : 'Failed to load lists');
    } finally {
      setListsLoading(false);
    }
  }, [isAuthenticated, propertyId, isAr]);

  // Close picker on outside click
  useEffect(() => {
    if (!showListPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        heartRef.current && !heartRef.current.contains(e.target as Node)
      ) {
        setShowListPicker(false);
        setShowNewList(false);
        setNewListName('');
      }
    };
    const handleScroll = () => {
      setShowListPicker(false);
      setShowNewList(false);
      setNewListName('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showListPicker]);

  const handleToggleInList = async (listId: string) => {
    if (!propertyId) return;
    setTogglingList(listId);
    const wasIn = memberListIds.has(listId);
    try {
      await wishlistsApi.toggleProperty(listId, propertyId);
      setMemberListIds(prev => {
        const next = new Set(prev);
        if (wasIn) next.delete(listId);
        else next.add(listId);
        return next;
      });
      const newCount = wasIn ? memberListIds.size - 1 : memberListIds.size + 1;
      setIsWishlisted(newCount > 0);
    } catch {
      toast.error(isAr ? 'فشل في التحديث' : 'Failed to update');
    } finally {
      setTogglingList(null);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || !propertyId) return;
    setCreatingList(true);
    try {
      const res = await wishlistsApi.createList(newListName.trim());
      const newList = res.data.data;
      await wishlistsApi.toggleProperty(newList._id, propertyId);
      setLists(prev => [...prev, { ...newList, propertyCount: 1, coverImage: null }]);
      setMemberListIds(prev => new Set([...prev, newList._id]));
      setIsWishlisted(true);
      setNewListName('');
      setShowNewList(false);
      toast.success(isAr ? 'تم إنشاء القائمة' : 'List created');
    } catch {
      toast.error(isAr ? 'فشل في الإنشاء' : 'Failed to create');
    } finally {
      setCreatingList(false);
    }
  };

  const handleClearAll = async () => {
    if (!propertyId || memberListIds.size === 0) return;
    setClearingAll(true);
    try {
      await Promise.all(
        [...memberListIds].map((lid) => wishlistsApi.toggleProperty(lid, propertyId))
      );
      setMemberListIds(new Set());
      setIsWishlisted(false);
      setShowListPicker(false);
      setShowNewList(false);
      toast.success(isAr ? 'تمت الإزالة' : 'Removed from all lists');
    } catch {
      toast.error(isAr ? 'فشل في الإزالة' : 'Failed to remove');
    } finally {
      setClearingAll(false);
    }
  };

  const getListDisplayName = (list?: WishlistList) => {
    if (!list) return '';
    if (list.isDefault) return isAr ? 'مفضلتي' : 'My Favorites';
    return list.name;
  };

  // ── Images: prefer unit images, fallback to property images (primary first) ──
  const galleryImages: PropertyImage[] = (() => {
    if (unit?.images && unit.images.length > 0) {
      return unit.images
        .map(img => ({
          url: img.url,
          caption: img.caption,
          isPrimary: img.isPrimary ?? false,
        }))
        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    }
    if (property?.images && property.images.length > 0) {
      return [...property.images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    }
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
                {propertyTitle && property && (
                  <p className="text-base text-gray-500 mb-2">
                    <Link href={`/property/${property._id}`} className="hover:text-primary-600 hover:underline transition-colors">
                      {propertyTitle}
                    </Link>
                  </p>
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
                    {isAr ? `خصم ${discountPercent}%` : `${discountPercent}% Discount`}
                  </span>
                )}
                <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={isAr ? 'مشاركة' : 'Share'}>
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  ref={heartRef}
                  onClick={openListPicker}
                  disabled={wishlistLoading}
                  className="group/heart p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                  title={isAr ? 'المفضلة' : 'Wishlist'}
                >
                  <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover/heart:fill-red-500 group-hover/heart:text-red-500'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Image gallery — unit images with fallback */}
          <div className="mb-8">
            <ImageGallery images={galleryImages} title={displayTitle} />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Quick stats — always visible */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { Icon: Users, label: t('property.maxGuests'), value: unit.capacity?.maxGuests ?? '\u2014' },
                  { Icon: BedDouble, label: t('property.bedrooms'), value: unit.bedrooms?.count ?? '\u2014' },
                  { Icon: Bath, label: t('property.bathrooms'), value: unit.bathroomCount ?? '\u2014' },
                  { Icon: BedDouble, label: t('property.beds'), value: ((unit.bedrooms?.singleBeds ?? 0) + (unit.bedrooms?.doubleBeds ?? 0)) || '\u2014' },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <Icon className="w-5 h-5 text-primary-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* Host info — always visible */}
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

              {/* Segmented navigation — tab switching */}
              <div className="bg-gray-100 rounded-xl p-1 flex gap-0.5 w-full overflow-x-auto no-scrollbar">
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

              {/* ── Tab: Specification ── */}
              {activeSection === 'specification' && (
                <div className="space-y-8">
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
                          <span key={feature} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg">
                            <span className="text-base">{getAmenityIcon(feature)}</span>
                            {getAmenityLabel(feature, language as 'en' | 'ar')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Reviews ── */}
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

              {/* ── Tab: Location & Map ── */}
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

              {/* ── Tab: Terms & Policies ── */}
              {activeSection === 'terms' && (
                <div>
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
                </div>
              )}

            </div>

            {/* Right column – Booking widget (still receives property for backward compat) */}
            <div className="lg:col-span-1">
              <BookingWidget property={property} initialUnitId={unit._id} initialCheckIn={initialCheckIn} initialCheckOut={initialCheckOut} initialAdults={initialAdults} initialChildren={initialChildren} />
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* ── Wishlist List Picker Portal ── */}
      {showListPicker && typeof window !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={pickerStyle}
          className="bg-white rounded-xl shadow-xl border border-gray-200 w-[260px] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              {isAr ? 'المفضلة' : 'Wishlist'}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowListPicker(false); setShowNewList(false); setNewListName(''); }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {listsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
            ) : (
              lists.map((list) => {
                const isIn = memberListIds.has(list._id);
                return (
                  <button
                    key={list._id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleInList(list._id); }}
                    disabled={togglingList === list._id}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start disabled:opacity-60"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isIn ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                    }`}>
                      {togglingList === list._id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : isIn ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-800 truncate flex-1">
                      {getListDisplayName(list)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {list.propertyCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: New wishlist + Clear */}
          <div className="border-t border-gray-100">
            {showNewList ? (
              <div className="p-2.5 flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }}
                  placeholder={isAr ? 'اسم القائمة' : 'List name'}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-400 outline-none"
                />
                <button
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 px-2 py-1.5"
                >
                  {creatingList ? <Loader2 className="w-3 h-3 animate-spin" /> : (isAr ? 'إنشاء' : 'Create')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 p-1.5">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNewList(true); }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 hover:text-primary-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {isAr ? 'قائمة جديدة' : 'New list'}
                </button>
                {memberListIds.size > 0 && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearAll(); }}
                    disabled={clearingAll}
                    className="flex items-center justify-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {clearingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    {isAr ? 'إزالة الكل' : 'Remove all'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
