'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Users, BedDouble, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { Property, User } from '@/types';
import { formatPriceNumber, getPropertyTypeLabel, getDiscountedPrice } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import SarSymbol from '@/components/ui/SarSymbol';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES } from '@/lib/constants';
import { useState, useCallback } from 'react';
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
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(isAr ? 'سجّل دخولك لحفظ العقارات' : 'Please sign in to save properties');
      return;
    }
    setWishlistLoading(true);
    try {
      await toggleWishlist(property._id);
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted
        ? (isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist')
        : (isAr ? 'تمت الإضافة للمفضلة' : 'Saved to wishlist'));
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Something went wrong');
    } finally {
      setWishlistLoading(false);
    }
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
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className="absolute bottom-3 ltr:right-3 rtl:left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all duration-200 disabled:opacity-60"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`}
            />
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
              {property.capacity.maxGuests} {property.capacity.maxGuests === 1 ? t('card.guest') : t('card.guests')}
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
