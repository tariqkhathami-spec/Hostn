'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { wishlistsApi } from '@/lib/api';
import { WishlistList, Property } from '@/types';
import {
  Heart, Loader2, ArrowLeft, Trash2, MapPin, Users, BedDouble,
  Building, Star, Droplets, Percent, Compass, Ruler, X, ChevronDown, Map,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { formatPriceNumber, getPropertyTypeLabel, getDiscountedPrice, getGuestLabel } from '@/lib/utils';
import SarSymbol from '@/components/ui/SarSymbol';
import StarRating from '@/components/ui/StarRating';
import { CITIES, DISTRICTS, DIRECTIONS } from '@/lib/constants';

// ─── Constants (same as /listings) ──────────────────────────────────────────
const PROPERTY_TYPES = [
  { key: 'chalet', label: { en: 'Chalets', ar: 'شاليهات' } },
  { key: 'villa', label: { en: 'Villas', ar: 'فلل' } },
  { key: 'apartment', label: { en: 'Apartments', ar: 'شقق' } },
  { key: 'farm', label: { en: 'Farms', ar: 'مزارع' } },
  { key: 'camp', label: { en: 'Camps', ar: 'مخيمات' } },
  { key: 'hotel', label: { en: 'Hotels', ar: 'فنادق' } },
  { key: 'studio', label: { en: 'Studios', ar: 'استوديو' } },
];

const BEDROOM_OPTIONS = [
  { value: '', label: { en: 'Any', ar: 'الكل' } },
  { value: '1', label: { en: '1+', ar: '1+' } },
  { value: '2', label: { en: '2+', ar: '2+' } },
  { value: '3', label: { en: '3+', ar: '3+' } },
  { value: '4', label: { en: '4+', ar: '4+' } },
  { value: '5', label: { en: '5+', ar: '5+' } },
];

const RATING_OPTIONS = [
  { value: '', label: { en: 'Any', ar: 'الكل' } },
  { value: '6', label: { en: '6+', ar: '6+' } },
  { value: '7', label: { en: '7+', ar: '7+' } },
  { value: '8', label: { en: '8+', ar: '8+' } },
  { value: '9', label: { en: '9+', ar: '9+' } },
];

// ─── FilterBubble (copied from /listings) ───────────────────────────────────
function FilterBubble({
  icon: Icon,
  label,
  active,
  onClick,
  onClear,
  hasDropdown,
}: {
  icon: React.ElementType;
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  hasDropdown?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
        active
          ? 'bg-primary-50 border-primary-300 text-primary-700'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {active && onClear ? (
        <span role="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="ml-0.5 hover:text-primary-900">
          <X className="w-3 h-3" />
        </span>
      ) : hasDropdown ? (
        <ChevronDown className="w-3 h-3 opacity-50" />
      ) : null}
    </button>
  );
}

// ─── Get mismatch reasons for a property against active filters ─────────────
function getMismatchReasons(
  property: Property,
  filters: {
    selectedTypes: string[];
    minBedrooms: string;
    minRating: string;
    hasPool: boolean;
    hasDiscount: boolean;
    priceRange: number;
    areaRange: number;
    direction: string;
    district: string;
  },
  lang: 'en' | 'ar',
): string[] {
  const reasons: string[] = [];
  const isAr = lang === 'ar';

  if (filters.selectedTypes.length > 0 && !filters.selectedTypes.includes(property.type)) {
    const typeLabel = getPropertyTypeLabel(property.type, lang);
    reasons.push(isAr ? `النوع: ${typeLabel}` : `Type: ${typeLabel}`);
  }

  if (filters.minBedrooms && property.capacity.bedrooms < Number(filters.minBedrooms)) {
    reasons.push(isAr
      ? `${property.capacity.bedrooms} غرف نوم فقط`
      : `Only ${property.capacity.bedrooms} bedroom${property.capacity.bedrooms !== 1 ? 's' : ''}`);
  }

  if (filters.minRating && property.ratings.average < Number(filters.minRating)) {
    reasons.push(isAr
      ? `التقييم ${property.ratings.average || 0}`
      : `Rating ${property.ratings.average || 0}`);
  }

  if (filters.hasPool && !property.amenities?.includes('pool')) {
    reasons.push(isAr ? 'بدون مسبح' : 'No pool');
  }

  if (filters.hasDiscount && property.pricing.discountPercent <= 0) {
    reasons.push(isAr ? 'بدون خصم' : 'No discount');
  }

  if (filters.priceRange < 4000 && property.pricing.perNight > filters.priceRange) {
    reasons.push(isAr
      ? `السعر ﷼${property.pricing.perNight}`
      : `Price SAR ${property.pricing.perNight}`);
  }

  if (filters.areaRange < 1500 && property.area && property.area > filters.areaRange) {
    reasons.push(isAr
      ? `المساحة ${property.area} م²`
      : `Area ${property.area} m²`);
  }

  if (filters.direction && property.direction && property.direction !== filters.direction) {
    const dirLabel = DIRECTIONS.find(d => d.value === property.direction)?.[lang] || property.direction;
    reasons.push(isAr ? `الاتجاه: ${dirLabel}` : `Direction: ${dirLabel}`);
  }

  if (filters.district && property.location.district?.toLowerCase() !== filters.district.toLowerCase()) {
    reasons.push(isAr ? `حي مختلف` : `Different district`);
  }

  return reasons;
}

export default function WishlistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.listId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [list, setList] = useState<WishlistList | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Filter state ──
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minBedrooms, setMinBedrooms] = useState('');
  const [minRating, setMinRating] = useState('');
  const [hasPool, setHasPool] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [priceRange, setPriceRange] = useState(4000);
  const [areaRange, setAreaRange] = useState(1500);
  const [direction, setDirection] = useState('');
  const [district, setDistrict] = useState('');
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = selectedTypes.length > 0 || !!minBedrooms || !!minRating
    || hasPool || hasDiscount || priceRange < 4000 || areaRange < 1500
    || !!direction || !!district;

  const translateCity = (city: string) => {
    if (!isAr) return city;
    const found = CITIES.find(
      (c) => c.value.toLowerCase() === city.toLowerCase() || c.en.toLowerCase() === city.toLowerCase()
    );
    return found?.ar || city;
  };

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setMinBedrooms('');
    setMinRating('');
    setHasPool(false);
    setHasDiscount(false);
    setPriceRange(4000);
    setAreaRange(1500);
    setDirection('');
    setDistrict('');
    setOpenFilter(null);
  };

  // Click-outside for filter popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRowRef.current && !filterRowRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const filters = { selectedTypes, minBedrooms, minRating, hasPool, hasDiscount, priceRange, areaRange, direction, district };

  // Separate matching and non-matching properties
  const matched: Property[] = [];
  const mismatched: { property: Property; reasons: string[] }[] = [];

  if (hasActiveFilters) {
    for (const p of properties) {
      const reasons = getMismatchReasons(p, filters, lang);
      if (reasons.length === 0) {
        matched.push(p);
      } else {
        mismatched.push({ property: p, reasons });
      }
    }
  }

  const displayProperties = hasActiveFilters ? matched : properties;

  // Collect unique cities across properties for district filter
  const propertyCities = [...new Set(properties.map(p => p.location.city?.toLowerCase()))];
  const availableDistricts = propertyCities.length === 1 && DISTRICTS[properties[0]?.location.city]
    ? DISTRICTS[properties[0].location.city]
    : [];

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
          <h1 className="text-2xl font-bold text-gray-900">
            {list.isDefault ? (isAr ? 'مفضلاتي' : 'My Favorites') : list.name}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {properties.length} {isAr ? 'عقار' : properties.length === 1 ? 'property' : 'properties'}
            {hasActiveFilters && ` · ${matched.length} ${isAr ? 'مطابق' : 'matching'}`}
          </p>
        </div>
      </div>

      {/* Filter bar — only show when there are properties to filter */}
      {properties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" ref={filterRowRef}>
          {/* Type */}
          <div className="relative">
            <FilterBubble
              icon={Building}
              label={selectedTypes.length > 0
                ? (selectedTypes.length === 1
                  ? (PROPERTY_TYPES.find(t => t.key === selectedTypes[0])?.label[lang] || selectedTypes[0])
                  : `${selectedTypes.length} ${isAr ? 'أنواع' : 'types'}`)
                : (isAr ? 'نوع العقار' : 'Type')}
              active={selectedTypes.length > 0}
              onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
              onClear={selectedTypes.length > 0 ? () => setSelectedTypes([]) : undefined}
              hasDropdown
            />
            {openFilter === 'type' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[220px]">
                <div className="grid grid-cols-2 gap-1.5">
                  {PROPERTY_TYPES.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => toggleType(key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedTypes.includes(key)
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-gray-600 hover:bg-gray-50 border border-gray-100'
                      }`}>
                      {label[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bedrooms */}
          <div className="relative">
            <FilterBubble
              icon={BedDouble}
              label={minBedrooms ? `${minBedrooms}+ ${isAr ? 'غرف' : 'bed'}` : (isAr ? 'غرف النوم' : 'Bedrooms')}
              active={!!minBedrooms}
              onClick={() => setOpenFilter(openFilter === 'bedrooms' ? null : 'bedrooms')}
              onClear={minBedrooms ? () => setMinBedrooms('') : undefined}
              hasDropdown
            />
            {openFilter === 'bedrooms' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[180px]">
                <div className="flex flex-wrap gap-1.5">
                  {BEDROOM_OPTIONS.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => { setMinBedrooms(value); setOpenFilter(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        minBedrooms === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {label[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="relative">
            <FilterBubble
              icon={Star}
              label={minRating ? `${minRating}+` : (isAr ? 'التقييم' : 'Rating')}
              active={!!minRating}
              onClick={() => setOpenFilter(openFilter === 'rating' ? null : 'rating')}
              onClear={minRating ? () => setMinRating('') : undefined}
              hasDropdown
            />
            {openFilter === 'rating' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[160px]">
                <div className="flex flex-wrap gap-1.5">
                  {RATING_OPTIONS.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => { setMinRating(value); setOpenFilter(null); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        minRating === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {value && <Star className="w-3 h-3" />}
                      {label[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pool */}
          <FilterBubble icon={Droplets} label={isAr ? 'مسبح' : 'Pool'} active={hasPool}
            onClick={() => setHasPool(!hasPool)}
            onClear={hasPool ? () => setHasPool(false) : undefined}
          />

          {/* Discount */}
          <FilterBubble icon={Percent} label={isAr ? 'عروض' : 'Offers'} active={hasDiscount}
            onClick={() => setHasDiscount(!hasDiscount)}
            onClear={hasDiscount ? () => setHasDiscount(false) : undefined}
          />

          {/* Price */}
          <div className="relative">
            <FilterBubble
              icon={SarSymbol}
              label={priceRange < 4000
                ? <>{isAr ? 'حتى' : 'Up to'} <span dir="ltr"><SarSymbol /> {priceRange}</span></>
                : (isAr ? 'السعر' : 'Price')}
              active={priceRange < 4000}
              onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
              onClear={priceRange < 4000 ? () => setPriceRange(4000) : undefined}
              hasDropdown
            />
            {openFilter === 'price' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[260px]">
                <div className="text-center mb-2">
                  <span className="text-xs font-bold text-primary-700" dir="ltr"><SarSymbol /> {priceRange >= 4000 ? '4000+' : priceRange}</span>
                </div>
                <input type="range" min="0" max="4000" step="100" value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-primary-600 h-1.5 cursor-pointer" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr"><SarSymbol /> 0</span>
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr"><SarSymbol /> 2000</span>
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr"><SarSymbol /> 4000+</span>
                </div>
              </div>
            )}
          </div>

          {/* Area */}
          <div className="relative">
            <FilterBubble
              icon={Ruler}
              label={areaRange < 1500 ? `${isAr ? 'حتى' : 'Up to'} ${areaRange} m²` : (isAr ? 'المساحة (m²)' : 'Area (m²)')}
              active={areaRange < 1500}
              onClick={() => setOpenFilter(openFilter === 'area' ? null : 'area')}
              onClear={areaRange < 1500 ? () => setAreaRange(1500) : undefined}
              hasDropdown
            />
            {openFilter === 'area' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 min-w-[260px]">
                <div className="text-center mb-2">
                  <span className="text-xs font-bold text-primary-700" dir="ltr">{areaRange >= 1500 ? '1500+' : areaRange} m²</span>
                </div>
                <input type="range" min="0" max="1500" step="50" value={areaRange}
                  onChange={(e) => setAreaRange(Number(e.target.value))}
                  className="w-full accent-primary-600 h-1.5 cursor-pointer" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr">0 m²</span>
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr">650 m²</span>
                  <span className="text-[10px] font-medium text-gray-500" dir="ltr">1500+ m²</span>
                </div>
              </div>
            )}
          </div>

          {/* Direction */}
          <div className="relative">
            <FilterBubble
              icon={Compass}
              label={direction ? (DIRECTIONS.find(d => d.value === direction)?.[lang] || direction) : (isAr ? 'الاتجاه' : 'Direction')}
              active={!!direction}
              onClick={() => setOpenFilter(openFilter === 'direction' ? null : 'direction')}
              onClear={direction ? () => setDirection('') : undefined}
              hasDropdown
            />
            {openFilter === 'direction' && (
              <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[200px]">
                <div className="grid grid-cols-2 gap-1.5">
                  {DIRECTIONS.map((d) => (
                    <button key={d.value} type="button"
                      onClick={() => { setDirection(d.value); setOpenFilter(null); }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        direction === d.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {d[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* District — only show if all properties are from the same city */}
          {availableDistricts.length > 0 && (
            <div className="relative">
              <FilterBubble
                icon={Map}
                label={district
                  ? (availableDistricts.find(d => d.value === district)?.[lang] || district)
                  : (isAr ? 'الحي' : 'District')}
                active={!!district}
                onClick={() => setOpenFilter(openFilter === 'district' ? null : 'district')}
                onClear={district ? () => setDistrict('') : undefined}
                hasDropdown
              />
              {openFilter === 'district' && (
                <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 min-w-[220px] max-h-[280px] overflow-y-auto">
                  <div className="space-y-1">
                    {availableDistricts.map((d) => (
                      <button key={d.value} type="button"
                        onClick={() => { setDistrict(d.value); setOpenFilter(null); }}
                        className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          district === d.value ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                        {d[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" />
              {isAr ? 'مسح الكل' : 'Clear all'}
            </button>
          )}
        </div>
      )}

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
        <>
          {/* Matching properties */}
          {displayProperties.length === 0 && hasActiveFilters ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-amber-800 text-sm font-medium">
                {isAr ? 'لا توجد عقارات مطابقة للفلاتر المحددة' : 'No properties match the selected filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProperties.map((property) => (
                <PropertyListCard
                  key={property._id}
                  property={property}
                  isAr={isAr}
                  lang={lang}
                  removingId={removingId}
                  onRemove={handleRemoveProperty}
                  translateCity={translateCity}
                />
              ))}
            </div>
          )}

          {/* Non-matching properties (dimmed with reason notes) */}
          {hasActiveFilters && mismatched.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {isAr ? 'لا تطابق الفلاتر' : 'Doesn\'t match filters'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                {mismatched.map(({ property, reasons }) => (
                  <div key={property._id} className="relative">
                    <PropertyListCard
                      property={property}
                      isAr={isAr}
                      lang={lang}
                      removingId={removingId}
                      onRemove={handleRemoveProperty}
                      translateCity={translateCity}
                    />
                    {/* Mismatch note overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-amber-50 border-t border-amber-200 rounded-b-xl px-3 py-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-tight">
                          {reasons.join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Property card sub-component ────────────────────────────────────────────
function PropertyListCard({
  property,
  isAr,
  lang,
  removingId,
  onRemove,
  translateCity,
}: {
  property: Property;
  isAr: boolean;
  lang: 'en' | 'ar';
  removingId: string | null;
  onRemove: (id: string) => void;
  translateCity: (city: string) => string;
}) {
  const primaryImage =
    property.images?.find((img) => img.isPrimary)?.url ||
    property.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800';

  const discountedPrice =
    property.pricing.discountPercent > 0
      ? getDiscountedPrice(property.pricing.perNight, property.pricing.discountPercent)
      : null;

  return (
    <div className="relative group">
      <button
        onClick={() => onRemove(property._id)}
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
          <div className="relative aspect-[4/3] bg-gray-100">
            <Image
              src={primaryImage}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
            <div className="absolute bottom-3 ltr:left-3 rtl:right-3">
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                {getPropertyTypeLabel(property.type, lang)}
              </span>
            </div>
            {property.pricing.discountPercent > 0 && (
              <div className="absolute top-3 ltr:left-3 rtl:right-3">
                <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {isAr ? `خصم ${property.pricing.discountPercent}%` : `${property.pricing.discountPercent}% OFF`}
                </span>
              </div>
            )}
          </div>

          <div className="p-4">
            {property.ratings.count > 0 && (
              <StarRating rating={property.ratings.average} count={property.ratings.count} className="mb-2" />
            )}
            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
              {property.title}
            </h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{property.location.district ? `${property.location.district}, ` : ''}{translateCity(property.location.city)}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 text-xs mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {getGuestLabel(property.capacity.maxGuests, isAr ? 'ar' : 'en')}
              </span>
              <span className="flex items-center gap-1">
                <BedDouble className="w-3 h-3" />
                {property.capacity.bedrooms} {property.capacity.bedrooms !== 1 ? (isAr ? 'غرف' : 'beds') : (isAr ? 'غرفة' : 'bed')}
              </span>
            </div>
            <div>
              {discountedPrice ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(discountedPrice)}</span>
                  <span className="text-xs text-gray-400 line-through" dir="ltr"><SarSymbol /> {formatPriceNumber(property.pricing.perNight)}</span>
                  <span className="text-xs text-gray-500">{isAr ? '/ ليلة' : '/ night'}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-primary-600" dir="ltr"><SarSymbol /> {formatPriceNumber(property.pricing.perNight)}</span>
                  <span className="text-xs text-gray-500">{isAr ? '/ ليلة' : '/ night'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
