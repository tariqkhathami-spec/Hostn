'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, hostApi } from '@/lib/api';
import { Plus, ToggleLeft, ToggleRight, Edit, Loader2, Building, Layers, AlertTriangle, MapPin } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface Property {
  _id: string;
  title: string;
  titleAr?: string;
  type: string;
  location?: { city?: string; district?: string };
  images?: { url: string; isPrimary?: boolean }[];
  unitImage?: { url: string };
  isActive: boolean;
  unitCount?: number;
  activeUnitCount?: number;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'My Properties', ar: '\u0639\u0642\u0627\u0631\u0627\u062a\u064a' },
  addNew: { en: 'Add New Property', ar: '\u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u0627\u0631 \u062c\u062f\u064a\u062f' },
  active: { en: 'Active', ar: '\u0646\u0634\u0637' },
  inactive: { en: 'Inactive', ar: '\u063a\u064a\u0631 \u0646\u0634\u0637' },
  noProperties: { en: 'No properties yet. Add your first property!', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0639\u0642\u0627\u0631\u0643 \u0627\u0644\u0623\u0648\u0644!' },
  edit: { en: 'Edit', ar: '\u062a\u0639\u062f\u064a\u0644' },
  units: { en: 'Units', ar: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  toggled: { en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
  noUnits: { en: 'No units — add units to activate', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a \u2014 \u0623\u0636\u0641 \u0648\u062d\u062f\u0627\u062a \u0644\u0644\u062a\u0641\u0639\u064a\u0644' },
  unitCount: { en: 'units', ar: '\u0648\u062d\u062f\u0627\u062a' },
  activeOf: { en: 'active of', ar: '\u0646\u0634\u0637\u0629 \u0645\u0646' },
};

const PROPERTY_TYPES: Record<string, Record<string, string>> = {
  apartment: { en: 'Apartment', ar: '\u0634\u0642\u0629' },
  villa: { en: 'Villa', ar: '\u0641\u064a\u0644\u0627' },
  chalet: { en: 'Chalet', ar: '\u0634\u0627\u0644\u064a\u0647' },
  studio: { en: 'Studio', ar: '\u0627\u0633\u062a\u0648\u062f\u064a\u0648' },
  farm: { en: 'Farm', ar: '\u0645\u0632\u0631\u0639\u0629' },
  camp: { en: 'Camp', ar: '\u0645\u062e\u064a\u0645' },
  hotel: { en: 'Hotel', ar: '\u0641\u0646\u062f\u0642' },
};

export default function HostListingsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? '\u0639\u0642\u0627\u0631\u0627\u062a\u064a' : 'My Listings');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await propertiesApi.getMyProperties();
      setProperties(res.data.data || res.data || []);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await hostApi.togglePropertyStatus(id);
      setProperties((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive: !p.isActive } : p))
      );
      toast.success(t.toggled[lang]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' : 'Failed to update status'));
    }
  };

  const displayName = (p: Property) => isAr && p.titleAr ? p.titleAr : p.title;
  const displayType = (p: Property) => PROPERTY_TYPES[p.type]?.[lang] || p.type;
  const displayCity = (p: Property) => p.location?.city || '';

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
        <Link
          href="/host/listings/new"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t.addNew[lang]}
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t.noProperties[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const hasUnits = (property.unitCount || 0) > 0;
            const activeUnits = property.activeUnitCount || 0;
            const totalUnits = property.unitCount || 0;
            // Effective status: only truly active if has active units
            const effectiveActive = property.isActive && hasUnits && activeUnits > 0;
            const canToggle = hasUnits && activeUnits > 0;

            return (
              <div key={property._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-stretch">
                  {/* Image / placeholder */}
                  <div className="w-28 sm:w-36 flex-shrink-0 bg-gray-100 relative">
                    {(property.images?.[0]?.url || property.unitImage?.url) ? (
                      <img src={property.images?.[0]?.url || property.unitImage!.url} alt={displayName(property)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                        <Building className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{displayName(property)}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span className="bg-gray-100 px-2 py-0.5 rounded-full">{displayType(property)}</span>
                            {displayCity(property) && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {displayCity(property)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Status badge */}
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          effectiveActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {effectiveActive ? t.active[lang] : t.inactive[lang]}
                        </span>
                      </div>

                      {/* Unit count */}
                      <div className="mt-2">
                        {hasUnits ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <Layers className="w-3.5 h-3.5 text-primary-500" />
                            <span className="font-medium">{activeUnits}</span>
                            <span className="text-gray-400">{t.activeOf[lang]}</span>
                            <span>{totalUnits} {t.unitCount[lang]}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.noUnits[lang]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <Link href={`/host/listings/${property._id}/edit`}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                          <Edit className="w-4 h-4" />
                          {t.edit[lang]}
                        </Link>
                        <Link href={`/host/listings/${property._id}/units`}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            hasUnits ? 'text-gray-600 hover:text-primary-600' : 'text-primary-600 font-medium hover:text-primary-700'
                          }`}>
                          <Layers className="w-4 h-4" />
                          {t.units[lang]}
                          {!hasUnits && <Plus className="w-3 h-3" />}
                        </Link>
                      </div>
                      <button
                        onClick={() => canToggle && handleToggle(property._id)}
                        disabled={!canToggle}
                        className={`flex items-center gap-1 text-sm transition-colors ${
                          canToggle
                            ? 'text-gray-600 hover:text-primary-600 cursor-pointer'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={!canToggle ? (isAr ? 'أضف وحدات أولاً' : 'Add units first') : ''}
                      >
                        {effectiveActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
