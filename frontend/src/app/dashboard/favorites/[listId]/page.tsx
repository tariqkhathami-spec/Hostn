'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { wishlistsApi } from '@/lib/api';
import { WishlistList, Property } from '@/types';
import {
  Heart,
  Loader2,
  ArrowLeft,
  Trash2,
  MapPin,
  Users,
  BedDouble,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { formatPriceNumber, getPropertyTypeLabel, getDiscountedPrice, getGuestLabel } from '@/lib/utils';
import SarSymbol from '@/components/ui/SarSymbol';
import StarRating from '@/components/ui/StarRating';
import { CITIES } from '@/lib/constants';

export default function WishlistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.listId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [list, setList] = useState<WishlistList | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(
      (c) => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase()
    );
    return found?.ar || city;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !listId) return;
    const fetchList = async () => {
      try {
        const res = await wishlistsApi.getList(listId);
        setList(res.data.data || null);
      } catch {
        toast.error(isAr ? 'فشل في تحميل القائمة' : 'Failed to load list');
        router.push('/dashboard/favorites');
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [isAuthenticated, listId, router, isAr]);

  const handleRemoveProperty = async (propertyId: string) => {
    if (!list) return;
    setRemovingId(propertyId);
    try {
      await wishlistsApi.toggleProperty(listId, propertyId);
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          properties: prev.properties?.filter((p) => p._id !== propertyId),
          propertyCount: prev.propertyCount - 1,
        };
      });
      toast.success(isAr ? 'تمت إزالة العقار من القائمة' : 'Property removed from list');
    } catch {
      toast.error(isAr ? 'فشل في إزالة العقار' : 'Failed to remove property');
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{isAr ? 'القائمة غير موجودة' : 'List not found'}</p>
      </div>
    );
  }

  const properties = list.properties || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/favorites')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 rtl:rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {list.propertyCount} {isAr ? 'عقار' : list.propertyCount === 1 ? 'property' : 'properties'}
          </p>
        </div>
      </div>

      {/* Properties grid */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            {isAr ? 'لا توجد عقارات في هذه القائمة بعد' : 'No properties in this list yet'}
          </p>
          <Link
            href="/listings"
            className="inline-block bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {isAr ? 'تصفح العقارات' : 'Browse Properties'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const primaryImage =
              property.images?.find((img) => img.isPrimary)?.url ||
              property.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800';

            const discountedPrice =
              property.pricing.discountPercent > 0
                ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
                : null;

            return (
              <div key={property._id} className="relative group">
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveProperty(property._id)}
                  disabled={removingId === property._id}
                  className="absolute top-3 ltr:right-3 rtl:left-3 z-10 p-2 bg-white/90 rounded-full shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                  title={isAr ? 'إزالة من القائمة' : 'Remove from list'}
                >
                  {removingId === property._id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500" />
                  )}
                </button>

                <Link href={`/listings/${property._id}`}>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-100">
                      <Image
                        src={primaryImage}
                        alt={property.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                      />
                      {/* Type badge */}
                      <div className="absolute bottom-3 ltr:left-3 rtl:right-3">
                        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                          {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
                        </span>
                      </div>
                      {/* Discount badge */}
                      {property.pricing.discountPercent > 0 && (
                        <div className="absolute top-3 ltr:left-3 rtl:right-3">
                          <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            {isAr
                              ? `خصم ${property.pricing.discountPercent}%`
                              : `${property.pricing.discountPercent}% OFF`}
                          </span>
                        </div>
                      )}
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
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                        {property.title}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {property.location.district
                            ? `${property.location.district}, `
                            : ''}
                          {translateCity(property.location.city)}
                        </span>
                      </div>

                      {/* Capacity */}
                      <div className="flex items-center gap-3 text-gray-500 text-xs mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {getGuestLabel(property.capacity.maxGuests, isAr ? 'ar' : 'en')}
                        </span>
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3" />
                          {property.capacity.bedrooms}{' '}
                          {property.capacity.bedrooms !== 1
                            ? isAr
                              ? 'غرف'
                              : 'beds'
                            : isAr
                              ? 'غرفة'
                              : 'bed'}
                        </span>
                      </div>

                      {/* Price */}
                      <div>
                        {discountedPrice ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-primary-600" dir="ltr">
                              <SarSymbol /> {formatPriceNumber(discountedPrice)}
                            </span>
                            <span className="text-xs text-gray-400 line-through" dir="ltr">
                              <SarSymbol /> {formatPriceNumber(property.pricing.perNight)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {isAr ? '/ ليلة' : '/ night'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-primary-600" dir="ltr">
                              <SarSymbol /> {formatPriceNumber(property.pricing.perNight)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {isAr ? '/ ليلة' : '/ night'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
