'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Users, BedDouble, Bath, Ruler, ChevronLeft, ChevronRight, BadgeCheck, Plus, Loader2, X, Check, Trash2 } from 'lucide-react';
import { Property, User, WishlistList } from '@/types';
import { formatPriceNumber, getPropertyTypeLabel, getDiscountedPrice, getGuestLabel, calculateNights, getNightLabel } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import SarSymbol from '@/components/ui/SarSymbol';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { wishlistsApi } from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

interface PropertyCardProps {
  property: Property;
  checkIn?: string;
  checkOut?: string;
}

export default function PropertyCard({ property, checkIn, checkOut }: PropertyCardProps) {
  const { user, isAuthenticated, toggleWishlist } = useAuth();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(c => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase());
    return found?.ar || city;
  };

  const translateDistrict = (district: string, city: string) => {
    if (!isAr) return district;
    const cityDistricts = DISTRICTS[city] || [];
    const found = cityDistricts.find(d => d.value.toLowerCase() === district.toLowerCase() || d.en.toLowerCase() === district.toLowerCase());
    return found?.ar || district;
  };

  const [isWishlisted, setIsWishlisted] = useState(
    user?.wishlist?.includes(property._id) ?? false
  );
  useEffect(() => {
    setIsWishlisted(user?.wishlist?.includes(property._id) ?? false);
  }, [user?.wishlist, property._id]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // List picker state
  const [showListPicker, setShowListPicker] = useState(false);
  const [lists, setLists] = useState<WishlistList[]>([]);
  const [memberListIds, setMemberListIds] = useState<Set<string>>(new Set());
  const [listsLoading, setListsLoading] = useState(false);
  const [togglingList, setTogglingList] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

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

  // Pricing: total, weekly, monthly
  const effectivePrice = discountedPrice || property.pricing.perNight;
  const nights = (checkIn && checkOut) ? calculateNights(checkIn, checkOut) : 0;
  const totalPrice = nights > 0 ? effectivePrice * nights : 0;

  let displayPrice = effectivePrice;
  let originalDisplayPrice = property.pricing.perNight;
  let priceUnitLabel: string;
  if (nights >= 30) {
    displayPrice = effectivePrice * 30;
    originalDisplayPrice = property.pricing.perNight * 30;
    priceUnitLabel = isAr ? '/ شهر' : '/ month';
  } else if (nights >= 7) {
    displayPrice = effectivePrice * 7;
    originalDisplayPrice = property.pricing.perNight * 7;
    priceUnitLabel = isAr ? '/ أسبوع' : '/ week';
  } else {
    priceUnitLabel = t('property.perNight');
  }

  // Click-outside to close list picker (exclude heart button)
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

  // Fetch lists + membership when picker opens (2 parallel calls, no N+1)
  const openListPicker = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }

    // Calculate fixed position relative to heart button
    if (heartRef.current) {
      const rect = heartRef.current.getBoundingClientRect();
      const pickerW = 240;
      const gap = 8;
      let left = isAr ? rect.left : rect.right - pickerW;
      left = Math.max(gap, Math.min(left, window.innerWidth - pickerW - gap));

      if (rect.top > 220) {
        setPickerStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + gap,
          left,
          maxHeight: rect.top - gap * 2,
          zIndex: 9999,
        });
      } else {
        setPickerStyle({
          position: 'fixed',
          top: rect.bottom + gap,
          left,
          maxHeight: window.innerHeight - rect.bottom - gap * 2,
          zIndex: 9999,
        });
      }
    }

    setShowListPicker(true);
    setListsLoading(true);
    try {
      const [listsRes, memberRes] = await Promise.all([
        wishlistsApi.getLists(),
        wishlistsApi.getPropertyMembership(property._id),
      ]);
      setLists(listsRes.data.data || []);
      setMemberListIds(new Set(memberRes.data.data || []));
    } catch {
      toast.error(isAr ? 'فشل في تحميل القوائم' : 'Failed to load lists');
      setShowListPicker(false);
    } finally {
      setListsLoading(false);
    }
  };

  // Multi-select: toggle property in a list (check/uncheck)
  const handleToggleInList = async (listId: string) => {
    setTogglingList(listId);
    const wasIn = memberListIds.has(listId);
    try {
      await wishlistsApi.toggleProperty(listId, property._id);
      setMemberListIds(prev => {
        const next = new Set(prev);
        if (wasIn) next.delete(listId);
        else next.add(listId);
        return next;
      });
      // Update wishlisted state: property is wishlisted if it's in ANY list
      const stillInAny = wasIn
        ? memberListIds.size > 1 // removing from one, but still in others
        : true; // just added
      setIsWishlisted(stillInAny);
    } catch {
      toast.error(isAr ? 'فشل في تحديث القائمة' : 'Failed to update list');
    } finally {
      setTogglingList(null);
    }
  };

  // Create new list and add property to it
  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await wishlistsApi.createList(newListName.trim());
      const newList = res.data.data;
      await wishlistsApi.toggleProperty(newList._id, property._id);
      setLists(prev => [...prev, { ...newList, propertyCount: 1, coverImage: null }]);
      setMemberListIds(prev => new Set([...prev, newList._id]));
      setNewListName('');
      setShowNewList(false);
      setIsWishlisted(true);
      toast.success(isAr ? `تم الحفظ في "${newListName.trim()}"` : `Saved to "${newListName.trim()}"`);
    } catch {
      toast.error(isAr ? 'فشل في إنشاء القائمة' : 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  // Clear from ALL wishlists
  const handleClearFromAll = async () => {
    if (memberListIds.size === 0) return;
    setClearingAll(true);
    try {
      await Promise.all(
        [...memberListIds].map((listId) => wishlistsApi.toggleProperty(listId, property._id))
      );
      setMemberListIds(new Set());
      setIsWishlisted(false);
      setShowListPicker(false);
      setShowNewList(false);
      setNewListName('');
      toast.success(isAr ? 'تم الإزالة من جميع القوائم' : 'Removed from all wishlists');
    } catch {
      toast.error(isAr ? 'فشل في الإزالة' : 'Failed to remove');
    } finally {
      setClearingAll(false);
    }
  };

  // Heart click: always opens picker (for both add and manage)
  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }
    openListPicker(e);
  };

  const getListDisplayName = (list?: WishlistList) => {
    if (!list) return '';
    if (list.isDefault) return isAr ? 'مفضلاتي' : 'My Favorites';
    return list.name;
  };

  return (
    <>
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

          {/* Carousel arrows */}
          {images.length > 1 && (
            <>
              <button onClick={handlePrevImage} className="absolute top-1/2 -translate-y-1/2 ltr:left-2 rtl:right-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white">
                <ChevronLeft className="w-4 h-4 text-gray-700 rtl:rotate-180" />
              </button>
              <button onClick={handleNextImage} className="absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white">
                <ChevronRight className="w-4 h-4 text-gray-700 rtl:rotate-180" />
              </button>
            </>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {images.map((_, idx) => (
                <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-2.5' : 'bg-white/60'}`} />
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
            ref={heartRef}
            onClick={handleHeartClick}
            disabled={wishlistLoading}
            className="absolute bottom-3 ltr:right-3 rtl:left-3 p-1.5 hover:scale-110 transition-all duration-200 disabled:opacity-60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          >
            <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'fill-white/60 text-white/80'}`} />
          </button>

          {/* Type badge */}
          <div className="absolute bottom-3 ltr:left-3 rtl:right-3">
            <span className="badge bg-black/60 text-white text-xs backdrop-blur-sm">
              {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1">{property.location.district ? `${translateDistrict(property.location.district, property.location.city)}, ` : ''}{translateCity(property.location.city)}</span>
            {host?.isVerified && (
              <span className="flex items-center gap-0.5 text-primary-600" title="Verified Host">
                <BadgeCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-gray-500 text-xs mb-3">
            <span className="flex items-center gap-1" title={isAr ? 'ضيوف' : 'Guests'}>
              <Users className="w-3 h-3" />
              {property.capacity.maxGuests}
            </span>
            <span className="flex items-center gap-1" title={isAr ? 'غرف نوم' : 'Bedrooms'}>
              <BedDouble className="w-3 h-3" />
              {property.capacity.bedrooms}
            </span>
            <span className="flex items-center gap-1" title={isAr ? 'حمامات' : 'Bathrooms'}>
              <Bath className="w-3 h-3" />
              {property.capacity.bathrooms}
            </span>
            {property.area ? (
              <span className="flex items-center gap-1" title={isAr ? 'المساحة' : 'Area'}>
                <Ruler className="w-3 h-3" />
                {property.area} {isAr ? 'م²' : 'm²'}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <div>
              {discountedPrice ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(displayPrice)}</span>
                  <span className="text-xs text-gray-400 line-through" dir="ltr"><SarSymbol /> {formatPriceNumber(originalDisplayPrice)}</span>
                  <span className="text-xs text-gray-500">{priceUnitLabel}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(displayPrice)}</span>
                  <span className="text-xs text-gray-500">{priceUnitLabel}</span>
                </div>
              )}
              {nights > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isAr
                    ? <><span>إجمالي{getNightLabel(nights, 'ar')}:</span> <span dir="ltr"><SarSymbol /> {formatPriceNumber(totalPrice)}</span></>
                    : <>Total for {getNightLabel(nights, 'en')}: <span dir="ltr"><SarSymbol /> {formatPriceNumber(totalPrice)}</span></>
                  }
                </p>
              )}
            </div>
            {property.ratings.count > 0 && (
              <StarRating rating={property.ratings.average} count={property.ratings.count} />
            )}
          </div>
        </div>
      </div>
    </Link>

    {/* Wishlist picker — rendered as portal to avoid overflow-hidden clipping */}
    {showListPicker && typeof window !== 'undefined' && createPortal(
      <div
        ref={pickerRef}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={pickerStyle}
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-60 flex flex-col overflow-hidden"
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
            <div className="p-2 flex items-center gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={isAr ? 'اسم القائمة' : 'List name'}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleCreateAndAdd(); if (e.key === 'Escape') { setShowNewList(false); setNewListName(''); } }}
              />
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateAndAdd(); }}
                disabled={creatingList || !newListName.trim()}
                className="bg-primary-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {creatingList ? <Loader2 className="w-3 h-3 animate-spin" /> : isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNewList(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start"
              >
                <Plus className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-600 font-medium">
                  {isAr ? 'قائمة مفضلة جديدة' : 'New wishlist'}
                </span>
              </button>
              {memberListIds.size > 0 && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearFromAll(); }}
                  disabled={clearingAll}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-50 transition-colors text-start border-t border-gray-100 disabled:opacity-60"
                >
                  {clearingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-red-500 font-medium">
                    {isAr ? 'إزالة من الكل' : 'Clear'}
                  </span>
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
