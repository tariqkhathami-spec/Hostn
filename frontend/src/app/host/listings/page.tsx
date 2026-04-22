'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, hostApi, unitsApi } from '@/lib/api';
import {
  Plus, ToggleLeft, ToggleRight, Pencil, Loader2, Building, Layers,
  AlertTriangle, MapPin, ChevronDown, ChevronUp, Users, Bed, Droplets,
  Calendar, Link2, Compass, ExternalLink, Check, Trash2, X,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import SarSymbol from '@/components/ui/SarSymbol';
import type { Unit } from '@/types';
import { CITIES, DISTRICTS } from '@/lib/constants';
import { URLS } from '@/lib/urls';

interface Property {
  _id: string;
  title: string;
  titleAr?: string;
  type: string;
  location?: {
    city?: string;
    district?: string;
    address?: string;
    coordinates?: { lat?: number; lng?: number };
  };
  direction?: string;
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
  noProperties: { en: 'No properties yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0639\u062f' },
  noPropertiesDesc: { en: 'Add your first property to start hosting', ar: '\u0623\u0636\u0641 \u0639\u0642\u0627\u0631\u0643 \u0627\u0644\u0623\u0648\u0644 \u0644\u0628\u062f\u0621 \u0627\u0644\u0627\u0633\u062a\u0636\u0627\u0641\u0629' },
  edit: { en: 'Edit', ar: '\u062a\u0639\u062f\u064a\u0644' },
  toggled: { en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
  noUnits: { en: 'Add at least one unit to activate', ar: '\u0623\u0636\u0641 \u0648\u062d\u062f\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u062a\u0641\u0639\u064a\u0644' },
  activateUnit: { en: 'Activate at least one unit', ar: '\u0641\u0639\u0651\u0644 \u0648\u062d\u062f\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' },
  unitCount: { en: 'units', ar: '\u0648\u062d\u062f\u0627\u062a' },
  activeOf: { en: 'active of', ar: '\u0646\u0634\u0637\u0629 \u0645\u0646' },
  showUnits: { en: 'Units', ar: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  manageAll: { en: 'Manage all units', ar: '\u0625\u062f\u0627\u0631\u0629 \u0643\u0644 \u0627\u0644\u0648\u062d\u062f\u0627\u062a' },
  addUnit: { en: 'Add Unit', ar: '\u0625\u0636\u0627\u0641\u0629 \u0648\u062d\u062f\u0629' },
  pricing: { en: 'Calendar', ar: '\u0627\u0644\u062a\u0642\u0648\u064a\u0645' },
  noUnitsYet: { en: 'No units yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a' },
  statusUpdated: { en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
  copyLink: { en: 'Copy Link', ar: '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637' },
  linkCopied: { en: 'Link copied!', ar: '\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637!' },
  viewOnMap: { en: 'Map', ar: '\u0627\u0644\u062e\u0631\u064a\u0637\u0629' },
  addNewUnit: { en: 'Add New Unit', ar: 'إضافة وحدة جديدة' },
  selectProperty: { en: 'Select a property', ar: 'اختر عقاراً' },
  delete: { en: 'Delete', ar: 'حذف' },
  deleteProperty: { en: 'Delete property', ar: 'حذف العقار' },
  deletePropertyConfirm: {
    en: 'This will remove the property and all its units from your listings. Active bookings will remain. Continue?',
    ar: 'سيؤدي هذا إلى إزالة العقار وجميع وحداته من قوائمك. ستبقى الحجوزات النشطة. متابعة؟',
  },
  deleteUnit: { en: 'Delete unit', ar: 'حذف الوحدة' },
  deleteUnitConfirm: {
    en: 'This will remove the unit from your listings. Active bookings will remain. Continue?',
    ar: 'سيؤدي هذا إلى إزالة الوحدة من قوائمك. ستبقى الحجوزات النشطة. متابعة؟',
  },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  propertyDeleted: { en: 'Property deleted', ar: 'تم حذف العقار' },
  unitDeleted: { en: 'Unit deleted', ar: 'تم حذف الوحدة' },
};

const DIRECTION_LABELS: Record<string, Record<string, string>> = {
  north: { en: 'North', ar: '\u0634\u0645\u0627\u0644' },
  south: { en: 'South', ar: '\u062c\u0646\u0648\u0628' },
  east: { en: 'East', ar: '\u0634\u0631\u0642' },
  west: { en: 'West', ar: '\u063a\u0631\u0628' },
  northeast: { en: 'Northeast', ar: '\u0634\u0645\u0627\u0644 \u0634\u0631\u0642' },
  northwest: { en: 'Northwest', ar: '\u0634\u0645\u0627\u0644 \u063a\u0631\u0628' },
  southeast: { en: 'Southeast', ar: '\u062c\u0646\u0648\u0628 \u0634\u0631\u0642' },
  southwest: { en: 'Southwest', ar: '\u062c\u0646\u0648\u0628 \u063a\u0631\u0628' },
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  // Delete confirmation state — one modal handles both property + unit deletion.
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'property'; id: string; name: string }
    | { kind: 'unit'; id: string; name: string; propertyId: string }
    | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        setPropertyUnits((prev) => ({ ...prev, [propertyId]: res.data.data || [] }));
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
      const updatedUnits = (propertyUnits[propertyId] || []).map((u) =>
        u._id === unitId ? { ...u, isActive: !u.isActive } : u
      );
      setPropertyUnits((prev) => ({ ...prev, [propertyId]: updatedUnits }));

      const allInactive = updatedUnits.length > 0 && updatedUnits.every((u) => !u.isActive);
      if (allInactive) {
        setProperties((prev) =>
          prev.map((p) => (p._id === propertyId ? { ...p, isActive: false, activeUnitCount: 0 } : p))
        );
      } else {
        const newActiveCount = updatedUnits.filter((u) => u.isActive).length;
        setProperties((prev) =>
          prev.map((p) => (p._id === propertyId ? { ...p, activeUnitCount: newActiveCount } : p))
        );
      }

      toast.success(t.statusUpdated[lang]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' : 'Failed to update status'));
    }
  };

  /* ── Helpers ── */
  const unitName = (unit: Unit) =>
    (isAr ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr) || (isAr ? '\u0628\u062f\u0648\u0646 \u0627\u0633\u0645' : 'Untitled');

  const primaryImage = (unit: Unit) =>
    unit.images?.find((i) => i.isPrimary)?.url || unit.images?.[0]?.url;

  const avgPrice = (pricing?: Record<string, number | boolean | undefined>) => {
    if (!pricing) return 0;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const prices = days
      .map((d) => (typeof pricing[d] === 'number' ? pricing[d] as number : 0))
      .filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };

  const displayName = (p: Property) => (isAr && p.titleAr ? p.titleAr : p.title);
  const displayType = (p: Property) => PROPERTY_TYPES[p.type]?.[lang] || p.type;

  const hasCoords = (p: Property) => p.location?.coordinates?.lat && p.location?.coordinates?.lng;

  const googleMapsUrl = (p: Property) => {
    const { lat, lng } = p.location?.coordinates || {};
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  /** Build a short location string: "City, District" (bilingual) */
  const locationSummary = (p: Property): string => {
    const parts: string[] = [];
    if (p.location?.city) {
      const city = p.location.city;
      const cityObj = CITIES.find(c => c.value.toLowerCase() === city.toLowerCase());
      parts.push(cityObj ? cityObj[lang] : city);
    }
    if (p.location?.district) {
      const district = p.location.district;
      const allDistricts = Object.values(DISTRICTS).flat();
      const distObj = allDistricts.find(d => d.value.toLowerCase() === district.toLowerCase());
      parts.push(distObj ? distObj[lang] : district);
    }
    return parts.join(isAr ? '\u060c ' : ', ');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.kind === 'property') {
        await propertiesApi.remove(deleteTarget.id);
        setProperties((prev) => prev.filter((p) => p._id !== deleteTarget.id));
        // Also drop any loaded units for the removed property.
        setPropertyUnits((prev) => {
          const next = { ...prev };
          delete next[deleteTarget.id];
          return next;
        });
        if (expandedPropertyId === deleteTarget.id) setExpandedPropertyId(null);
        toast.success(t.propertyDeleted[lang]);
      } else {
        await unitsApi.remove(deleteTarget.id);
        const { id: unitId, propertyId } = deleteTarget;
        setPropertyUnits((prev) => ({
          ...prev,
          [propertyId]: (prev[propertyId] || []).filter((u) => u._id !== unitId),
        }));
        // Decrement the total / active unit counts on the parent property.
        setProperties((prev) =>
          prev.map((p) =>
            p._id === propertyId
              ? {
                  ...p,
                  unitCount: Math.max(0, (p.unitCount || 0) - 1),
                  activeUnitCount: Math.max(
                    0,
                    (p.activeUnitCount || 0) -
                      ((propertyUnits[propertyId] || []).find((u) => u._id === unitId)?.isActive ? 1 : 0),
                  ),
                }
              : p,
          ),
        );
        toast.success(t.unitDeleted[lang]);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? 'فشل في الحذف' : 'Delete failed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyPropertyLink = async (propertyId: string) => {
    // Property detail pages live on the main domain (hostn.co), not business.hostn.co.
    // Use the main URL so shared links send guests to the right place.
    const url = `${URLS.main}/property/${propertyId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(propertyId);
      toast.success(t.linkCopied[lang]);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
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
        <div className="flex items-center gap-2">
          {/* Add New Unit */}
          <div className="relative">
            <button
              onClick={() => setShowUnitDropdown(!showUnitDropdown)}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t.addNewUnit[lang]}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showUnitDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUnitDropdown(false)} />
                <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[220px] end-0">
                  {properties.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">{t.noProperties[lang]}</p>
                  ) : (
                    properties.map((p) => (
                      <Link
                        key={p._id}
                        href={`/listings/${p._id}/units/new`}
                        onClick={() => setShowUnitDropdown(false)}
                        className="block w-full px-4 py-2.5 text-sm text-start text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {displayName(p)}
                      </Link>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          {/* Add New Property */}
          <Link
            href="/listings/new"
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.addNew[lang]}
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">{t.noProperties[lang]}</p>
          <p className="text-sm text-gray-400">{t.noPropertiesDesc[lang]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => {
            const hasUnits = (property.unitCount || 0) > 0;
            const activeUnits = property.activeUnitCount || 0;
            const totalUnits = property.unitCount || 0;
            const effectiveActive = property.isActive && hasUnits && activeUnits > 0;
            const canToggle = hasUnits && activeUnits > 0;
            const isExpanded = expandedPropertyId === property._id;
            const units = propertyUnits[property._id] || [];
            const isLoadingUnits = unitsLoading === property._id;
            const imgUrl = property.images?.[0]?.url || property.unitImage?.url;
            const loc = locationSummary(property);
            const dir = property.direction && DIRECTION_LABELS[property.direction]
              ? DIRECTION_LABELS[property.direction][lang]
              : null;

            return (
              <div
                key={property._id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* ── Property Header ── */}
                <div className="p-5">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      {imgUrl ? (
                        <img src={imgUrl} alt={displayName(property)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Row 1: Title + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-900 truncate leading-tight">
                          {displayName(property)}
                        </h3>
                        <span
                          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            effectiveActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {effectiveActive ? t.active[lang] : t.inactive[lang]}
                        </span>
                      </div>

                      {/* Row 2: Type + Location + Direction */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md text-xs font-medium">
                          {displayType(property)}
                        </span>
                        {loc && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {loc}
                          </span>
                        )}
                        {dir && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Compass className="w-3 h-3 flex-shrink-0" />
                            {dir}
                          </span>
                        )}
                      </div>

                      {/* Row 3: Copy Link + Map */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <button
                          onClick={() => copyPropertyLink(property._id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          {copiedId === property._id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Link2 className="w-3 h-3" />
                          )}
                          {t.copyLink[lang]}
                        </button>
                        {hasCoords(property) && (
                          <a
                            href={googleMapsUrl(property)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t.viewOnMap[lang]}
                          </a>
                        )}
                      </div>

                      {/* Row 4: Unit count + warnings */}
                      <div className="mt-auto pt-2">
                        {hasUnits ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <Layers className="w-3.5 h-3.5 text-primary-500" />
                              <span className="font-semibold text-gray-900">{activeUnits}</span>
                              <span className="text-gray-400">{t.activeOf[lang]}</span>
                              <span className="text-gray-600">{totalUnits} {t.unitCount[lang]}</span>
                            </span>
                            {activeUnits === 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="w-3 h-3" />
                                {t.activateUnit[lang]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.noUnits[lang]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Actions Bar ── */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <Link
                      href={`/listings/${property._id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t.edit[lang]}
                    </Link>

                    {/* Units toggle */}
                    <button
                      onClick={() => toggleExpand(property._id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isExpanded
                          ? 'bg-primary-100 text-primary-700'
                          : hasUnits
                            ? 'text-gray-600 hover:bg-white hover:text-primary-600 hover:shadow-sm'
                            : 'text-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {t.showUnits[lang]}
                      {hasUnits ? (
                        <span className="bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          {totalUnits}
                        </span>
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          kind: 'property',
                          id: property._id,
                          name: displayName(property),
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                      title={t.deleteProperty[lang]}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.delete[lang]}
                    </button>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => canToggle && handleToggle(property._id)}
                    disabled={!canToggle}
                    className={`p-1.5 rounded-lg transition-colors ${
                      canToggle
                        ? 'hover:bg-white cursor-pointer'
                        : 'opacity-30 cursor-not-allowed'
                    }`}
                    title={!canToggle ? (isAr ? '\u0623\u0636\u0641 \u0648\u062d\u062f\u0627\u062a \u0623\u0648\u0644\u0627\u064b' : 'Add units first') : ''}
                  >
                    {effectiveActive ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* ── Expanded Units ── */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {isLoadingUnits ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                      </div>
                    ) : units.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-sm text-gray-400 mb-3">{t.noUnitsYet[lang]}</p>
                        <Link
                          href={`/listings/${property._id}/units/new`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t.addUnit[lang]}
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <div className="divide-y divide-gray-100">
                          {units.map((unit) => {
                            const avg = avgPrice(unit.pricing);
                            const img = primaryImage(unit);
                            return (
                              <div
                                key={unit._id}
                                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors ${
                                  !unit.isActive ? 'opacity-50' : ''
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
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900 truncate">
                                      {unitName(unit)}
                                    </span>
                                    <span
                                      className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        unit.isActive
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      {unit.isActive ? t.active[lang] : t.inactive[lang]}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
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
                                        <SarSymbol /> {avg.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{isAr ? '\u0644\u064a\u0644\u0629' : 'night'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Unit actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Link
                                    href={`/listings/${property._id}/units/${unit._id}/edit`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg text-xs font-medium text-gray-700 hover:text-primary-600 shadow-sm transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t.edit[lang]}
                                  </Link>
                                  <Link
                                    href={`/listings/${property._id}/units/${unit._id}/calendar`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-700 shadow-sm transition-colors"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t.pricing[lang]}
                                  </Link>
                                  <button
                                    onClick={() => handleUnitToggle(unit._id, property._id)}
                                    className="p-1.5 rounded-lg hover:bg-white transition-colors"
                                  >
                                    {unit.isActive ? (
                                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: 'unit',
                                        id: unit._id,
                                        name: unitName(unit),
                                        propertyId: property._id,
                                      })
                                    }
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                    title={t.deleteUnit[lang]}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                          <Link
                            href={`/listings/${property._id}/units/new`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t.addUnit[lang]}
                          </Link>
                          <Link
                            href={`/listings/${property._id}/units`}
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

      {/* ── Delete confirmation modal (handles both property + unit) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {deleteTarget.kind === 'property' ? t.deleteProperty[lang] : t.deleteUnit[lang]}
                </h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-700 mb-3">
                {deleteTarget.kind === 'property'
                  ? t.deletePropertyConfirm[lang]
                  : t.deleteUnitConfirm[lang]}
              </p>
              <p className="text-sm font-semibold text-gray-900 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                {deleteTarget.name}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t.cancel[lang]}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Trash2 className="w-4 h-4" />
                {t.delete[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
