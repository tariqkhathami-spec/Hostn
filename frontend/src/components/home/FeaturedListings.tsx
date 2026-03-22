'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Property } from '@/types';
import { propertiesApi } from '@/lib/api';
import PropertyCard from '@/components/listings/PropertyCard';

interface FeaturedListingsProps {
  title?: string;
  subtitle?: string;
  city?: string;
  featured?: boolean;
}

export default function FeaturedListings({
  title = 'Featured Properties',
  subtitle = 'Handpicked stays for an unforgettable experience',
  city,
  featured,
}: FeaturedListingsProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const params: Record<string, string> = { limit: '8' };
        if (city) params.city = city;
        if (featured) params.featured = 'true';
        const res = await propertiesApi.getAll(params);
        setProperties(res.data.data);
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [city, featured]);

  if (loading) {
    return (
      <section className="py-14">
        <div className="container-custom">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (properties.length === 0) return null;

  return (
    <section className="py-8 sm:py-14">
      <div className="container-custom">
        <div className="flex justify-between items-end mb-5 sm:mb-8">
          <div>
            <h2 className="section-title mb-1">{title}</h2>
            <p className="text-gray-500 text-xs sm:text-sm">{subtitle}</p>
          </div>
          <Link
            href={`/listings${city ? `?city=${city}` : featured ? '?featured=true' : ''}`}
            className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property._id} property={property} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/listings${city ? `?city=${city}` : ''}`}
            className="btn-outline inline-flex items-center gap-2"
          >
            View all properties
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
