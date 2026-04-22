'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, unitsApi } from '@/lib/api';
import { Building2, ChevronDown, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import SarSymbol from '@/components/ui/SarSymbol';
import { formatPriceNumber } from '@/lib/utils';
import type { Unit } from '@/types';

interface Property {
  _id: string;
  title: string;
  titleAr?: string;
  isActive: boolean;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Pricing Management', ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0633\u0639\u0627\u0631' },
  active: { en: 'Active', ar: '\u0646\u0634\u0637' },
  inactive: { en: 'Inactive', ar: '\u063a\u064a\u0631 \u0646\u0634\u0637' },
  noProperties: { en: 'No properties yet. Add your first property to manage pricing.', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0639\u0642\u0627\u0631\u0643 \u0627\u0644\u0623\u0648\u0644 \u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0633\u0639\u0627\u0631.' },
  weekdayAvg: { en: 'Weekday', ar: '\u0623\u064a\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639' },
  weekendAvg: { en: 'Weekend', ar: '\u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639' },
  setPricing: { en: 'Set Pricing', ar: '\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0623\u0633\u0639\u0627\u0631' },
  noUnits: { en: 'No units in this property', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0639\u0642\u0627\u0631' },
  loadError: { en: 'Failed to load properties', ar: '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' },
  night: { en: 'night', ar: '\u0644\u064a\u0644\u0629' },
};

export default function HostPricingPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0633\u0639\u0627\u0631' : 'Pricing Management');

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyUnits, setPropertyUnits] = useState<Record<string, Unit[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [unitsLoading, setUnitsLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await propertiesApi.getMyProperties();
      setProperties(res.data.data || res.data || []);
    } catch {
      toast.error(t.loadError[lang]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (propertyId: string) => {
    const next = new Set(expandedProperties);
    if (next.has(propertyId)) {
      next.delete(propertyId);
      setExpandedProperties(next);
      return;
    }
    next.add(propertyId);
    setExpandedProperties(next);

    // Lazy-load units if not cached
    if (!propertyUnits[propertyId]) {
      setUnitsLoading(propertyId);
      try {
        const res = await unitsApi.getManage(propertyId);
        setPropertyUnits((prev) => ({ ...prev, [propertyId]: res.data.data || [] }));
      } catch {
        // silent fail — units section will show empty
      } finally {
        setUnitsLoading(null);
      }
    }
  };

  const displayName = (p: Property) => (isAr && p.titleAr ? p.titleAr : p.title);

  const unitName = (unit: Unit) =>
    (isAr ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr) ||
    (isAr ? '\u0628\u062f\u0648\u0646 \u0627\u0633\u0645' : 'Untitled');

  // After PR F, `unit.pricing` can hold boolean flags (stackable/enabled)
  // alongside numeric prices. Cast each lookup to Number so the reducers
  // only see numeric values.
  type PricingLike = Record<string, number | boolean | undefined>;
  const numericAt = (pricing: PricingLike | undefined, key: string): number => {
    const v = pricing?.[key];
    return typeof v === 'number' ? v : 0;
  };

  const weekdayAvg = (pricing?: PricingLike) => {
    if (!pricing) return 0;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday'];
    const prices = days.map((d) => numericAt(pricing, d)).filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };

  const weekendAvg = (pricing?: PricingLike) => {
    if (!pricing) return 0;
    const days = ['thursday', 'friday', 'saturday'];
    const prices = days.map((d) => numericAt(pricing, d)).filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title[lang]}</h1>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t.noProperties[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const isExpanded = expandedProperties.has(property._id);
            const units = propertyUnits[property._id] || [];
            const isLoadingUnits = unitsLoading === property._id;

            return (
              <div
                key={property._id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Property header — click to expand */}
                <button
                  onClick={() => toggleExpand(property._id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">
                      {displayName(property)}
                    </span>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        property.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {property.isActive ? t.active[lang] : t.inactive[lang]}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 rtl:rotate-180" />
                  )}
                </button>

                {/* Expanded units section */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50">
                    {isLoadingUnits ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                      </div>
                    ) : units.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-gray-400">{t.noUnits[lang]}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {units.map((unit) => {
                          const wd = weekdayAvg(unit.pricing);
                          const we = weekendAvg(unit.pricing);

                          return (
                            <div
                              key={unit._id}
                              className="flex items-center justify-between gap-4 px-5 py-3"
                            >
                              {/* Unit info */}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {unitName(unit)}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  {wd > 0 && (
                                    <span dir="ltr">
                                      {t.weekdayAvg[lang]}:{' '}
                                      <span className="font-semibold text-gray-700">
                                        <SarSymbol /> {formatPriceNumber(wd)}
                                      </span>
                                      /{t.night[lang]}
                                    </span>
                                  )}
                                  {we > 0 && (
                                    <span dir="ltr">
                                      {t.weekendAvg[lang]}:{' '}
                                      <span className="font-semibold text-gray-700">
                                        <SarSymbol /> {formatPriceNumber(we)}
                                      </span>
                                      /{t.night[lang]}
                                    </span>
                                  )}
                                  {wd === 0 && we === 0 && (
                                    <span className="text-gray-400 italic">
                                      {isAr ? '\u0644\u0645 \u064a\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0623\u0633\u0639\u0627\u0631' : 'No pricing set'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Set Pricing button */}
                              <Link
                                href={`/listings/${property._id}/units/${unit._id}/calendar`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                {t.setPricing[lang]}
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
