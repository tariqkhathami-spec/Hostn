'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Users, BedDouble, ChevronLeft, ChevronRight, BadgeCheck, Plus, Loader2, Check, X } from 'lucide-react';
import { Property, User, WishlistList } from '@/types';
import { formatPriceNumber, getPropertyTypeLabel, getDiscountedPrice, getGuestLabel } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import SarSymbol from '@/components/ui/SarSymbol';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES } from '@/lib/constants';
import { wishlistsApi } from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { user, isAuthenticated, toggleWishlist } = useAuth();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(c => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase());
    return found?.ar || city;
  };

  const [isWishlisted, setIsWishlisted] = useState(
    user?.wishlist?.includes(property._id) ?? false
  );
  // Sync with auth context changes (e.g., after page refresh + getMe)
  useEffect(() => {
    setIsWishlisted(user?.wishlist?.includes(property._id) ?? false);
  }, [user?.wishlist, property._id]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // List picker state
  const [showListPicker, setShowListPicker] = useState(false);
  const [lists, setLists] = useState<WishlistList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [togglingList, setTogglingList] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const images = property.images.length > 0
    ? property.images.slice(0, 5)
    : [{ url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', isPrimary: true }];

  const host = typeof property.host === 'object' ? property.host as User : null;

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const discountedPrice =
    property.pricing.discountPercent > 0
      ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
      : null;

  // Click-outside to close list picker
  useEffect(() => {
    if (!showListPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowListPicker(false);
        setShowNewList(false);
        setNewListName('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showListPicker]);

  // Fetch lists when picker opens
  const openListPicker = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }

    // If already wishlisted and user just taps heart again — open the picker to let them manage
    setShowListPicker(true);
    setListsLoading(true);
    try {
      const res = await wishlistsApi.getLists();
      const fetchedLists: WishlistList[] = res.data.data || [];
      // For each list, check if this property is in it — we need the full list data
      const detailedLists = await Promise.all(
        fetchedLists.map(async (list) => {
          try {
            const detail = await wishlistsApi.getList(list._id);
            const props = detail.data.data?.properties || [];
            return {
              ...list,
              _hasProperty: props.some((p: Property) => p._id === property._id),
            };
          } catch {
            return { ...list, _hasProperty: false };
          }
        })
      );
      setLists(detailedLists);
    } catch {
      toast.error(isAr ? 'فشل في تحميل القوائم' : 'Failed to load lists');
      setShowListPicker(false);
    } finally {
      setListsLoading(false);
    }
  };

  // Toggle property in a specific list
  const handleToggleInList = async (listId: string) => {
    setTogglingList(listId);
    try {
      await wishlistsApi.toggleProperty(listId, property._id);
      setLists((prev) =>
        prev.map((l) =>
          l._id === listId
            ? { ...l, _hasProperty: !(l as WishlistList & { _hasProperty: boolean })._hasProperty }
            : l
        )
      );
      // Sync the auth context wishlist
      try {
        const { authApi } = await import('@/lib/api');
        const meRes = await authApi.getMe();
        const freshUser = meRes.data.user || meRes.data.data;
        if (freshUser?.wishlist) {
          const normalizedWishlist = freshUser.wishlist.map((item: unknown) =>
            typeof item === 'object' && item !== null ? (item as { _id: string })._id : String(item)
          );
          // Update local state immediately
          setIsWishlisted(normalizedWishlist.includes(property._id));
        }
      } catch {
        // Silent fail — the toggle still worked server-side
      }
    } catch {
      toast.error(isAr ? 'فشل في تحديث القائمة' : 'Failed to update list');
    } finally {
      setTogglingList(null);
    }
  };

  // Create a new list and add property to it
  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await wishlistsApi.createList(newListName.trim());
      const newList = res.data.data;
      // Add property to the new list
      await wishlistsApi.toggleProperty(newList._id, property._id);
      setLists((prev) => [
        ...prev,
        { ...newList, propertyCount: 1, coverImage: null, _hasProperty: true },
      ]);
      setNewListName('');
      setShowNewList(false);
      setIsWishlisted(true);
      toast.success(isAr ? 'تم إنشاء القائمة وإضافة العقار' : 'List created & property saved');
    } catch {
      toast.error(isAr ? 'فشل في إنشاء القائمة' : 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  // Quick remove — if wishlisted and user wants fast remove, just use the old toggle
  const handleQuickRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }
    if (isWishlisted) {
      // Remove from all lists via the auth toggle (removes from default list)
      toast.success(isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist');
      await toggleWishlist(property._id);
    } else {
      // Not wishlisted — open picker to choose list
      openListPicker(e);
    }
  };

  const getListDisplayName = (list: WishlistList) => {
    if (list.isDefault) return isAr ? 'مفضلاتي' : 'My Favorites';
    return list.name;
  };

  return (
    <Link href={`/listings/${property._id}`} className="group block">
      <div className="card overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
        {/* Image Carousel */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100 group/carousel">
          <Image
            src={images[currentImageIndex]?.url || images[0].url}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />

          {/* Carousel arrows (show on hover, only if multiple images) */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute top-1/2 -translate-y-1/2 ltr:left-2 rtl:right-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 rtl:rotate-180" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 rtl:rotate-180" />
              </button>
            </>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex ? 'bg-white w-2.5' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Discount badge */}
          {property.pricing.discountPercent > 0 && (
            <div className="absolute top-3 ltr:right-3 rtl:left-3">
              <span className="badge bg-orange-500 text-white text-xs font-bold px-2.5 py-1">
                {isAr ? `خصم ${property.pricing.discountPercent}%` : `${property.pricing.discountPercent}% OFF`}
              </span>
            </div>
          )}

          {/* Featured badge */}
          {property.isFeatured && (
            <div className="absolute top-3 ltr:left-3 rtl:right-3">
              <span className="badge bg-primary-600 text-white text-xs font-semibold px-2.5 py-1">
                {isAr ? '⭐ مميز' : '⭐ Featured'}
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={isWishlisted ? handleQuickRemove : openListPicker}
            disabled={wishlistLoading}
            className="absolute bottom-3 ltr:right-3 rtl:left-3 p-1.5 hover:scale-110 transition-all duration-200 disabled:opacity-60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'fill-white/60 text-white/80'
              }`}
            />
          </button>

          {/* List picker popover */}
          {showListPicker && (
            <div
              ref={pickerRef}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="absolute bottom-12 ltr:right-2 rtl:left-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-60 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">
                  {isAr ? 'حفظ في قائمة' : 'Save to list'}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowListPicker(false); setShowNewList(false); setNewListName(''); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              {/* List items */}
              <div className="max-h-48 overflow-y-auto">
                {listsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                ) : (
                  lists.map((list) => {
                    const hasProperty = (list as WishlistList & { _hasProperty?: boolean })._hasProperty;
                    return (
                      <button
                        key={list._id}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleInList(list._id); }}
                        disabled={togglingList === list._id}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start disabled:opacity-60"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          hasProperty ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                        }`}>
                          {togglingList === list._id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          ) : hasProperty ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : null}
                        </div>
                        <span className="text-sm text-gray-800 truncate flex-1">
                          {getListDisplayName(list)}
                        </span>
                        {list.isDefault && (
                          <Heart className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Create new list */}
              <div className="border-t border-gray-100">
                {showNewList ? (
                  <div className="p-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder={isAr ? 'اسم القائمة' : 'List name'}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleCreateAndAdd();
                        if (e.key === 'Escape') { setShowNewList(false); setNewListName(''); }
                      }}
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateAndAdd(); }}
                      disabled={creatingList || !newListName.trim()}
                      className="bg-primary-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {creatingList ? <Loader2 className="w-3 h-3 animate-spin" /> : isAr ? 'إنشاء' : 'Create'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNewList(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start"
                  >
                    <Plus className="w-4 h-4 text-primary-600" />
                    <span className="text-sm text-primary-600 font-medium">
                      {isAr ? 'قائمة جديدة' : 'New list'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Type badge */}
          <div className="absolute bottom-3 ltr:left-3 rtl:right-3">
            <span className="badge bg-black/60 text-white text-xs backdrop-blur-sm">
              {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Rating */}
          {property.ratings.count > 0 && (
            <StarRating
              rating={property.ratings.average}
              count={property.ratings.count}
              className="mb-2"
            />
          )}

          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {property.title}
          </h3>

          {/* Location + Verified badge */}
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1">{property.location.district ? `${property.location.district}, ` : ''}{translateCity(property.location.city)}</span>
            {host?.isVerified && (
              <span className="flex items-center gap-0.5 text-primary-600" title="Verified Host">
                <BadgeCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Capacity */}
          <div className="flex items-center gap-3 text-gray-500 text-xs mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {getGuestLabel(property.capacity.maxGuests, isAr ? 'ar' : 'en')}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" />
              {property.capacity.bedrooms} {property.capacity.bedrooms !== 1 ? t('card.beds') : t('card.bed')}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              {discountedPrice ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-primary-600" dir="ltr">
                    <SarSymbol /> {formatPriceNumber(discountedPrice)}
                  </span>
                  <span className="text-xs text-gray-400 line-through" dir="ltr">
                    <SarSymbol /> {formatPriceNumber(property.pricing.perNight)}
                  </span>
                  <span className="text-xs text-gray-500">{t('property.perNight')}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-primary-600" dir="ltr">
                    <SarSymbol /> {formatPriceNumber(property.pricing.perNight)}
                  </span>
                  <span className="text-xs text-gray-500">{t('property.perNight')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
