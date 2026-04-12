'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, hostApi, unitsApi } from '@/lib/api';
import {
  Plus, ToggleLeft, ToggleRight, Edit, Pencil, Loader2, Building, Layers,
  AlertTriangle, MapPin, ChevronDown, ChevronUp, Users, Bed, Droplets,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import SarSymbol from '@/components/ui/SarSymbol';
import type { Unit } from '@/types';

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
  noUnits: { en: 'Add at least one unit to activate this property', ar: '\u0623\u0636\u0641 \u0648\u062d\u062f\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631' },
  activateUnit: { en: 'Activate at least one unit to enable this property', ar: '\u0641\u0639\u0651\u0644 \u0648\u062d\u062f\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631' },
  unitCount: { en: 'units', ar: '\u0648\u062d\u062f\u0627\u062a' },
  activeOf: { en: 'active of', ar: '\u0646\u0634\u0637\u0629 \u0645\u0646' },
  showUnits: { en: 'Units', ar: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  hideUnits: { en: 'Hide', ar: '\u0625\u062e\u0641\u0627\u0621' },
  manageAll: { en: 'Manage all units', ar: '\u0625\u062f\u0627\u0631\u0629 \u0643\u0644 \u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  addUnit: { en: 'Add Unit', ar: '\u0625\u0636\u0627\u0641\u0629 \u0648\u062d\u062f\u0629' },
  pricing: { en: 'Calendar', ar: '\u0627\u0644\u062a\u0642\u0648\u064a\u0645' },
  avgPrice: { en: 'Avg price', ar: '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0633\u0639\u0631' },
  guests: { en: 'Guests', ar: '\u0636\u064a\u0648\u0641' },
  bedrooms: { en: 'Bedrooms', ar: '\u063a\u0631\u0641 \u0646\u0648\u0645' },
  bathrooms: { en: 'Bathrooms', ar: '\u062d\u0645\u0627\u0645\u0627\u062a' },
  noUnitsYet: { en: 'No units yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a' },
  night: { en: 'night', ar: '\u0644\u064a\u0644\u0629' },
  statusUpdated: { en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
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
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [propertyUnits, setPropertyUnits] = useState<Record<string, Unit[]>>({});
  const [unitsLoading, setUnitsLoading] = useState<string | null>(null);

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

  const toggleExpand = async (propertyId: string) => {
    if (expandedPropertyId === propertyId) {
      setExpandedPropertyId(null);
      return;
    }
    setExpandedPropertyId(propertyId);
    if (!propertyUnits[propertyId]) {
      setUnitsLoading(propertyId);
      try {
        const res = await unitsApi.getManage(propertyId);
        setPropertyUnits(prev => ({ ...prev, [propertyId]: res.data.data || [] }));
      } catch {
        // silent fail
      } finally {
        setUnitsLoading(null);
      }
    }
  };

  const handleUnitToggle = async (unitId: string, propertyId: string) => {
    try {
      await unitsApi.toggle(unitId);
      const updatedUnits = (propertyUnits[propertyId] || []).map(u =>
        u._id === unitId ? { ...u, isActive: !u.isActive } : u
      );
      setPropertyUnits(prev => ({ ...prev, [propertyId]: updatedUnits }));

      // If all units are now inactive, auto-deactivate the property in local state
      const allInactive = updatedUnits.length > 0 && updatedUnits.every(u => !u.isActive);
      if (allInactive) {
        setProperties(prev =>
          prev.map(p => p._id === propertyId ? { ...p, isActive: false, activeUnitCount: 0 } : p)
        );
      } else {
        // Update activeUnitCount to stay in sync
        const newActiveCount = updatedUnits.filter(u => u.isActive).length;
        setProperties(prev =>
          prev.map(p => p._id === propertyId ? { ...p, activeUnitCount: newActiveCount } : p)
        );
      }

      toast.success(t.statusUpdated[lang]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' : 'Failed to update status'));
    }
  };

  const unitName = (unit: Unit) =>
    (isAr ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr) || (isAr ? '\u0628\u062f\u0648\u0646 \u0627\u0633\u0645' : 'Untitled');

  const primaryImage = (unit: Unit) =>
    unit.images?.find((i) => i.isPrimary)?.url || unit.images?.[0]?.url;

  const avgPrice = (pricing?: Record<string, number>) => {
    if (!pricing) return 0;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const prices = days.map((d) => pricing[d] || 0).filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
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

            const isExpanded = expandedPropertyId === property._id;
            const units = propertyUnits[property._id] || [];
            const isLoadingUnits = unitsLoading === property._id;

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
                          <>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                              <Layers className="w-3.5 h-3.5 text-primary-500" />
                              <span className="font-medium">{activeUnits}</span>
                              <span className="text-gray-400">{t.activeOf[lang]}</span>
                              <span>{totalUnits} {t.unitCount[lang]}</span>
                            </span>
                            {activeUnits === 0 && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 text-xs flex items-center gap-1.5 mt-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                {t.activateUnit[lang]}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 text-xs flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {t.noUnits[lang]}
                          </div>
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
                        {/* Expand/collapse units toggle */}
                        <button
                          onClick={() => toggleExpand(property._id)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            hasUnits
                              ? 'text-gray-600 hover:text-primary-600'
                              : 'text-primary-600 font-medium hover:text-primary-700'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          {t.showUnits[lang]}
                          {hasUnits && <span className="text-xs text-gray-400">({totalUnits})</span>}
                          {!hasUnits && <Plus className="w-3 h-3" />}
                        </button>
                      </div>
                      <button
                        onClick={() => canToggle && handleToggle(property._id)}
                        disabled={!canToggle}
                        className={`flex items-center gap-1 text-sm transition-colors ${
                          canToggle
                            ? 'text-gray-600 hover:text-primary-600 cursor-pointer'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={!canToggle ? (isAr ? '\u0623\u0636\u0641 \u0648\u062d\u062f\u0627\u062a \u0623\u0648\u0644\u0627\u064b' : 'Add units first') : ''}
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

                {/* Expanded units section */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50">
                    {isLoadingUnits ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                      </div>
                    ) : units.length === 0 ? (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-gray-400 mb-2">{t.noUnitsYet[lang]}</p>
                        <Link
                          href={`/host/listings/${property._id}/units/new`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t.addUnit[lang]}
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 bg-gray-50/50 rounded-lg border border-gray-100">
                        {units.map((unit) => {
                          const avg = avgPrice(unit.pricing);
                          const img = primaryImage(unit);
                          return (
                            <div
                              key={unit._id}
                              className={`flex items-start gap-3 px-4 py-3.5 hover:bg-white/80 transition-colors ${
                                !unit.isActive ? 'opacity-60' : ''
                              }`}
                            >
                              {/* Unit thumbnail */}
                              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                {img ? (
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Building className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                              </div>

                              {/* Unit info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-medium text-sm text-gray-900 truncate">
                                    {unitName(unit)}
                                  </span>
                                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                    unit.isActive
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {unit.isActive ? t.active[lang] : t.inactive[lang]}
                                  </span>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-1.5">
                                  {(unit.capacity?.maxGuests ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Users className="w-3 h-3" /> {unit.capacity!.maxGuests}
                                    </span>
                                  )}
                                  {(unit.bedrooms?.count ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Bed className="w-3 h-3" /> {unit.bedrooms!.count}
                                    </span>
                                  )}
                                  {(unit.bathroomCount ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Droplets className="w-3 h-3" /> {unit.bathroomCount}
                                    </span>
                                  )}
                                  {avg > 0 && (
                                    <span className="font-semibold text-primary-600" dir="ltr">
                                      <SarSymbol /> {avg.toLocaleString('en')}/{isAr ? '\u0644\u064a\u0644\u0629' : 'night'}
                                    </span>
                                  )}
                                </div>

                                {/* Unit actions */}
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/host/listings/${property._id}/units/${unit._id}/edit`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg text-xs font-medium text-gray-700 hover:text-primary-600 shadow-sm transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t.edit[lang]}
                                  </Link>
                                  <Link
                                    href={`/host/listings/${property._id}/units/${unit._id}/calendar`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-700 shadow-sm transition-colors"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t.pricing[lang]}
                                  </Link>
                                  <button
                                    onClick={() => handleUnitToggle(unit._id, property._id)}
                                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                                  >
                                    {unit.isActive ? (
                                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Footer: Add Unit + Manage all */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                          <Link
                            href={`/host/listings/${property._id}/units/new`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t.addUnit[lang]}
                          </Link>
                          <Link
                            href={`/host/listings/${property._id}/units`}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {t.manageAll[lang]}
                          </Link>
                        </div>
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
