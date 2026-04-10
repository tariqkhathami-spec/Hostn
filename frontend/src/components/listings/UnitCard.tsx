'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Users, BedDouble, Bath, Ruler, MapPin, BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Unit, User, Property } from '@/types';
import { formatPriceNumber, getPropertyTypeLabel } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import SarSymbol from '@/components/ui/SarSymbol';
import { useLanguage } from '@/context/LanguageContext';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { useState, useCallback } from 'react';

interface UnitCardProps {
  unit: Unit;
  checkIn?: string;
  checkOut?: string;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800';

const avgPrice = (pricing?: Record<string, number>) => {
  if (!pricing) return 0;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const prices = days.map(d => pricing[d] || 0).filter(p => p > 0);
  return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
};

export default function UnitCard({ unit }: UnitCardProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const property = typeof unit.property === 'object' ? (unit.property as Property) : null;
  const host = property && typeof property.host === 'object' ? (property.host as User) : null;

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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = unit.images && unit.images.length > 0
    ? unit.images.slice(0, 5)
    : [{ url: PLACEHOLDER_IMAGE, isPrimary: true }];

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  // Pricing
  const basePrice = avgPrice(unit.pricing);
  const discountPct = unit.pricing?.discountPercent ?? 0;
  const discountedPrice = discountPct > 0 ? Math.round(basePrice * (1 - discountPct / 100)) : 0;
  const displayPrice = discountedPrice || basePrice;
  const priceUnitLabel = t('property.perNight');

  // Ratings: prefer unit ratings, fall back to property ratings
  const ratings = unit.ratings?.count ? unit.ratings : property?.ratings;

  // Unit name
  const unitName = isAr && unit.nameAr ? unit.nameAr : (unit.nameEn || (isAr ? 'وحدة' : 'Unit'));

  // Property name
  const propertyName = property
    ? (isAr && property.titleAr ? property.titleAr : property.title)
    : '';

  // Location
  const location = property?.location;
  const locationText = location
    ? `${location.district ? `${translateDistrict(location.district, location.city)}, ` : ''}${translateCity(location.city)}`
    : '';

  return (
    <Link href={`/search/${unit._id}`} className="group block">
      <div className="card overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
        {/* Image Carousel */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100 group/carousel">
          <Image
            src={images[currentImageIndex]?.url || PLACEHOLDER_IMAGE}
            alt={unitName}
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
          {discountPct > 0 && (
            <div className="absolute top-3 ltr:right-3 rtl:left-3">
              <span className="badge bg-orange-500 text-white text-xs font-bold px-2.5 py-1">
                {isAr ? `خصم ${discountPct}%` : `${discountPct}% OFF`}
              </span>
            </div>
          )}

          {/* Property type badge */}
          {property && (
            <div className="absolute bottom-3 ltr:left-3 rtl:right-3">
              <span className="badge bg-black/60 text-white text-xs backdrop-blur-sm">
                {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Unit name */}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {unitName}
          </h3>

          {/* Property name subtitle */}
          {propertyName && (
            <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">{propertyName}</p>
          )}

          {/* Location + host verification */}
          {locationText && (
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1">{locationText}</span>
              {host?.isVerified && (
                <span className="flex items-center gap-0.5 text-primary-600" title={isAr ? 'مضيف موثق' : 'Verified Host'}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          )}

          {/* Capacity row */}
          <div className="flex items-center gap-2.5 text-gray-500 text-xs mb-3">
            {(unit.capacity?.maxGuests ?? 0) > 0 && (
              <span className="flex items-center gap-1" title={isAr ? 'ضيوف' : 'Guests'}>
                <Users className="w-3 h-3" />
                {unit.capacity!.maxGuests}
              </span>
            )}
            {(unit.bedrooms?.count ?? 0) > 0 && (
              <span className="flex items-center gap-1" title={isAr ? 'غرف نوم' : 'Bedrooms'}>
                <BedDouble className="w-3 h-3" />
                {unit.bedrooms!.count}
              </span>
            )}
            {(unit.bathroomCount ?? 0) > 0 && (
              <span className="flex items-center gap-1" title={isAr ? 'حمامات' : 'Bathrooms'}>
                <Bath className="w-3 h-3" />
                {unit.bathroomCount}
              </span>
            )}
            {unit.area ? (
              <span className="flex items-center gap-1" title={isAr ? 'المساحة' : 'Area'}>
                <Ruler className="w-3 h-3" />
                {unit.area} {isAr ? 'م²' : 'm\u00B2'}
              </span>
            ) : null}
          </div>

          {/* Pricing + Rating */}
          <div className="flex items-center justify-between">
            <div>
              {basePrice > 0 ? (
                discountedPrice ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(displayPrice)}</span>
                    <span className="text-xs text-gray-400 line-through" dir="ltr"><SarSymbol /> {formatPriceNumber(basePrice)}</span>
                    <span className="text-xs text-gray-500">{priceUnitLabel}</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(displayPrice)}</span>
                    <span className="text-xs text-gray-500">{priceUnitLabel}</span>
                  </div>
                )
              ) : null}
            </div>
            {(ratings?.count ?? 0) > 0 && ratings && (
              <StarRating rating={ratings.average} count={ratings.count} />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
