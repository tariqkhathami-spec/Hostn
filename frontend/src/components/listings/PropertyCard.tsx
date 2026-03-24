'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Users, BedDouble } from 'lucide-react';
import { Property } from '@/types';
import { formatPrice, getPropertyTypeLabel, getDiscountedPrice } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { user, isAuthenticated, toggleWishlist } = useAuth();
  const { t } = useLanguage();
  const [isWishlisted, setIsWishlisted] = useState(
    user?.wishlist?.includes(property._id) ?? false
  );
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const primaryImage =
    property.images.find((img) => img.isPrimary)?.url ||
    property.images[0]?.url ||
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800';

  const discountedPrice =
    property.pricing.discountPercent > 0
      ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
      : null;

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to save properties');
      return;
    }
    setWishlistLoading(true);
    try {
      await toggleWishlist(property._id);
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <Link href={`/listings/${property._id}`} className="group block">
      <div className="card overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={primaryImage}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />

          {/* Discount badge */}
          {property.pricing.discountPercent > 0 && (
            <div className="absolute top-3 ltr:right-3 rtl:left-3">
              <span className="badge bg-orange-500 text-white text-xs font-bold px-2.5 py-1">
                {property.pricing.discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Featured badge */}
          {property.isFeatured && (
            <div className="absolute top-3 ltr:left-3 rtl:right-3">
              <span className="badge bg-primary-600 text-white text-xs font-semibold px-2.5 py-1">
                ⭐ Featured
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className="absolute bottom-3 ltr:right-3 rtl:left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all duration-200 disabled:opacity-60"
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
              {getPropertyTypeLabel(property.type)}
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

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{property.location.district ? `${property.location.district}, ` : ''}{property.location.city}</span>
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
                  <span className="text-base font-bold text-primary-600">
                    {formatPrice(discountedPrice)}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(property.pricing.perNight)}
                  </span>
                  <span className="text-xs text-gray-500">{t('property.perNight')}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-primary-600">
                    {formatPrice(property.pricing.perNight)}
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
