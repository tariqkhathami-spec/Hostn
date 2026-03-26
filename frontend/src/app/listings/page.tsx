'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi } from '@/lib/api';
import { MapPin, Star, Loader2, Search } from 'lucide-react';

interface Property {
  _id: string;
  title: string;
  images: string[];
  location: { city: string };
  pricing: { basePrice: number };
  ratings: { average: number; count: number };
  type: string;
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchCity) params.city = searchCity;
      if (selectedType) params.type = selectedType;
      const res = await propertiesApi.getAll(params);
      setProperties(res.data.properties || res.data.data || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [selectedType]);

  const types = [
    { key: '', label: { en: 'All', ar: 'الكل' } },
    { key: 'chalet', label: { en: 'Chalets', ar: 'شاليهات' } },
    { key: 'villa', label: { en: 'Villas', ar: 'فلل' } },
    { key: 'apartment', label: { en: 'Apartments', ar: 'شقق' } },
    { key: 'farm', label: { en: 'Farms', ar: 'مزارع' } },
    { key: 'camp', label: { en: 'Camps', ar: 'مخيمات' } },
    { key: 'hotel', label: { en: 'Hotels', ar: 'فنادق' } },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'ابحث عن مدينة...' : 'Search by city...'}
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProperties()}
                className="flex-1 input-base"
              />
              <button onClick={fetchProperties} className="btn-primary flex items-center gap-2">
                <Search className="w-4 h-4" />
                {lang === 'ar' ? 'بحث' : 'Search'}
              </button>
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {types.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {label[lang]}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {lang === 'ar' ? 'لا توجد عقارات' : 'No properties found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property) => (
                <Link
                  key={property._id}
                  href={`/listings/${property._id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-[4/3] bg-gray-200 overflow-hidden">
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {lang === 'ar' ? 'لا توجد صورة' : 'No image'}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {property.location?.city || '—'}
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1 mb-2">{property.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary-700">
                        {property.pricing?.basePrice?.toLocaleString()} {lang === 'ar' ? 'ر.س' : 'SAR'}
                        <span className="text-gray-400 font-normal text-sm">
                          {' '}/{lang === 'ar' ? 'ليلة' : 'night'}
                        </span>
                      </span>
                      {property.ratings?.count > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                          {property.ratings.average?.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
