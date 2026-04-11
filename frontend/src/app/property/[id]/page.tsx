'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/property/ImageGallery';
import UnitCard from '@/components/listings/UnitCard';
import { Property, Unit, PropertyImage } from '@/types';
import { propertiesApi, unitsApi } from '@/lib/api';
import { getPropertyTypeLabel } from '@/lib/utils';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { MapPin, Building2 } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';
import { getSearchCookies } from '@/lib/searchCookies';

export default function PropertyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <PropertyDetailContent />
    </Suspense>
  );
}

function PropertyDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  // Search cookie dates for UnitCard pricing
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const displayTitle = property
    ? (isAr && property.titleAr ? property.titleAr : property.title)
    : '';

  usePageTitle(displayTitle || (isAr ? 'تفاصيل العقار' : 'Property Details'));

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(c => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase());
    return found?.ar || city;
  };

  const translateDistrict = (district: string, city: string) => {
    if (!isAr) return district;
    const cityDistricts = DISTRICTS[city] || [];
    const found = cityDistricts.find((d: { value: string; en: string; ar: string }) => d.value.toLowerCase() === district.toLowerCase() || d.en.toLowerCase() === district.toLowerCase());
    return found?.ar || district;
  };

  // Restore dates from cookies
  useEffect(() => {
    const saved = getSearchCookies();
    if (saved) {
      if (saved.checkIn) setCheckIn(saved.checkIn);
      if (saved.checkOut) setCheckOut(saved.checkOut);
    }
  }, []);

  // Fetch property + units
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propRes, unitsRes] = await Promise.all([
          propertiesApi.getOne(id),
          unitsApi.getForProperty(id),
        ]);
        setProperty(propRes.data.data);
        setUnits(unitsRes.data.data || []);
      } catch {
        // Property not found
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Gallery images from property, falling back to aggregated unit images
  const galleryImages: PropertyImage[] = (() => {
    if (property?.images && property.images.length > 0) {
      return [...property.images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    }
    // Fallback: use images from units
    const unitImages = units.flatMap(u => (u.images || []).map(img => ({ url: img.url, caption: img.caption, isPrimary: img.isPrimary ?? false })));
    if (unitImages.length > 0) {
      return unitImages.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    }
    return [{ url: '/placeholder-property.jpg', isPrimary: true }];
  })();

  // Location text
  const locationText = property?.location
    ? `${property.location.district ? `${translateDistrict(property.location.district, property.location.city)}, ` : ''}${translateCity(property.location.city)}`
    : '';

  // Loading skeleton
  if (loading) {
    return (
      <>
        <Header />
        <main className="container-custom py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/4 mb-6" />
            <div className="h-96 bg-gray-200 rounded-2xl mb-8" />
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-100 rounded-2xl" />
              <div className="h-80 bg-gray-100 rounded-2xl" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Not found
  if (!property) {
    return (
      <>
        <Header />
        <main className="container-custom py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">
            {isAr ? 'العقار غير موجود' : 'Property Not Found'}
          </h1>
          <p className="text-gray-500">
            {isAr ? 'ربما تم حذف هذا العقار أو لم يعد متاحًا.' : 'This property may have been removed or is no longer available.'}
          </p>
          <Link href="/search" className="btn-primary inline-flex mt-6">
            {t('property.browseProperties')}
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const ratings = property.ratings;
  const cityName = translateCity(property.location.city);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container-custom py-8">
          {/* Breadcrumb: Home > Search > City > Property Name */}
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary-600">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <Link href="/search" className="hover:text-primary-600">{t('breadcrumb.properties')}</Link>
            <span className="mx-2">/</span>
            <Link href={`/search?city=${property.location.city}`} className="hover:text-primary-600">
              {cityName}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800 line-clamp-1">{displayTitle}</span>
          </nav>

          {/* Property title + meta */}
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{displayTitle}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {ratings && ratings.count > 0 && (
                <StarRating rating={ratings.average} count={ratings.count} size="md" />
              )}
              {locationText && (
                <span className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  {locationText}
                </span>
              )}
              <span className="badge bg-primary-50 text-primary-700 text-xs font-semibold px-2 py-0.5">
                {getPropertyTypeLabel(property.type, language as 'en' | 'ar')}
              </span>
            </div>
          </div>

          {/* Image gallery */}
          <div className="mb-8">
            <ImageGallery images={galleryImages} title={displayTitle} />
          </div>

          {/* Available Units section */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              {isAr ? 'الوحدات المتاحة' : 'Available Units'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isAr
                ? `${units.length} ${units.length === 1 ? 'وحدة متاحة' : 'وحدات متاحة'}`
                : `${units.length} ${units.length === 1 ? 'unit available' : 'units available'}`}
            </p>

            {units.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {units.map((unit) => (
                  <UnitCard
                    key={unit._id}
                    unit={unit}
                    checkIn={checkIn || undefined}
                    checkOut={checkOut || undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {isAr ? 'لا توجد وحدات متاحة حاليًا' : 'No units available at the moment'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {isAr ? 'يرجى المحاولة لاحقًا' : 'Please check back later'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
