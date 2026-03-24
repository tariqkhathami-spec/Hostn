'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/property/ImageGallery';
import AmenitiesList from '@/components/property/AmenitiesList';
import ReviewsList from '@/components/property/ReviewsList';
import BookingWidget from '@/components/property/BookingWidget';
import { Property, User } from '@/types';
import { propertiesApi } from '@/lib/api';
import { getPropertyTypeLabel } from '@/lib/utils';
import { MapPin, Users, BedDouble, Bath, Clock, Cigarette, PawPrint, Music } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { useLanguage } from '@/context/LanguageContext';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await propertiesApi.getOne(id);
        setProperty(res.data.data);
      } catch {
        // 404
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

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

  if (!property) {
    return (
      <>
        <Header />
        <main className="container-custom py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{t('property.notFound')}</h1>
          <p className="text-gray-500">This property may have been removed or is no longer available.</p>
          <a href="/listings" className="btn-primary inline-flex mt-6">{t('property.browseProperties')}</a>
        </main>
        <Footer />
      </>
    );
  }

  const host = property.host as User;

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container-custom py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-4">
            <a href="/" className="hover:text-primary-600">{t('breadcrumb.home')}</a>
            <span className="mx-2">/</span>
            <a href="/listings" className="hover:text-primary-600">{t('breadcrumb.properties')}</a>
            <span className="mx-2">/</span>
            <a href={`/listings?city=${property.location.city}`} className="hover:text-primary-600">
              {property.location.city}
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-800 line-clamp-1">{property.title}</span>
          </nav>

          {/* Title */}
          <div className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {property.ratings.count > 0 && (
                    <StarRating rating={property.ratings.average} count={property.ratings.count} size="md" />
                  )}
                  <span className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    {property.location.district && `${property.location.district}, `}{property.location.city}
                  </span>
                  <span className="badge bg-primary-50 text-primary-700 text-xs font-semibold">
                    {getPropertyTypeLabel(property.type)}
                  </span>
                </div>
              </div>
              {property.pricing.discountPercent > 0 && (
                <span className="badge bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1.5">
                  🎉 {property.pricing.discountPercent}% Discount
                </span>
              )}
            </div>
          </div>

          {/* Image gallery */}
          <div className="mb-8">
            <ImageGallery images={property.images} title={property.title} />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { Icon: Users, label: t('property.maxGuests'), value: property.capacity.maxGuests },
                  { Icon: BedDouble, label: t('property.bedrooms'), value: property.capacity.bedrooms },
                  { Icon: BedDouble, label: t('property.beds'), value: property.capacity.beds },
                  { Icon: Bath, label: t('property.bathrooms'), value: property.capacity.bathrooms },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <Icon className="w-5 h-5 text-primary-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* Host info */}
              {host && typeof host === 'object' && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold text-lg">
                      {host.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t('property.hostedBy')} {host.name}</p>
                    <p className="text-sm text-gray-500">
                      Host since {new Date(host.createdAt).getFullYear()}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.aboutThisPlace')}</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {t('property.whatThisPlaceOffers')}
                  </h2>
                  <AmenitiesList amenities={property.amenities} showAll={showAllAmenities} />
                  {property.amenities.length > 10 && (
                    <button
                      onClick={() => setShowAllAmenities(!showAllAmenities)}
                      className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700 underline"
                    >
                      {showAllAmenities ? t('property.showLess') : `${t('property.showAll')} (${property.amenities.length})`}
                    </button>
                  )}
                </div>
              )}

              {/* House rules */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.houseRules')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      Icon: Clock,
                      label: t('property.checkIn'),
                      value: `After ${property.rules.checkInTime}`,
                    },
                    {
                      Icon: Clock,
                      label: t('property.checkOut'),
                      value: `Before ${property.rules.checkOutTime}`,
                    },
                    {
                      Icon: Cigarette,
                      label: t('property.smoking'),
                      value: property.rules.smokingAllowed ? t('property.allowed') : t('property.notAllowed'),
                    },
                    {
                      Icon: PawPrint,
                      label: t('property.pets'),
                      value: property.rules.petsAllowed ? t('property.allowed') : t('property.notAllowed'),
                    },
                    {
                      Icon: Music,
                      label: t('property.parties'),
                      value: property.rules.partiesAllowed ? t('property.allowed') : t('property.notAllowed'),
                    },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">{label}:</span> {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('property.guestReviews')}</h2>
                <ReviewsList
                  propertyId={property._id}
                  averageRating={property.ratings.average}
                  reviewCount={property.ratings.count}
                />
              </div>
            </div>

            {/* Right column – Booking widget */}
            <div className="lg:col-span-1">
              <BookingWidget property={property} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
