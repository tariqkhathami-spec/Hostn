'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/types';
import { propertiesApi, hostApi } from '@/lib/api';
import { formatPrice, getPropertyTypeLabel } from '@/lib/utils';
import {
  Plus,
  Search,
  Star,
  MapPin,
  Users,
  MoreVertical,
  Pencil,
  Eye,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Building2,
  LayoutGrid,
  List,
  BedDouble,
  Bath,
  CalendarDays,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { ListingsSkeleton } from '@/components/ui/PageSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

type ViewMode = 'grid' | 'table';
type SortField = 'title' | 'price' | 'rating' | 'created';
type SortDir = 'asc' | 'desc';

export default function HostListingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await propertiesApi.getMyProperties();
      setProperties(res.data.data || []);
    } catch {
      setError(true);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await hostApi.togglePropertyStatus(id);
      setProperties((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive: res.data.data.isActive } : p))
      );
      toast.success(res.data.data.isActive ? 'Property activated' : 'Property deactivated');
    } catch {
      toast.error('Failed to update status');
    }
    setMenuOpen(null);
  };

  const deleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to remove this property?')) return;
    try {
      await propertiesApi.delete(id);
      setProperties((prev) => prev.filter((p) => p._id !== id));
      toast.success('Property removed');
    } catch {
      toast.error('Failed to remove property');
    }
    setMenuOpen(null);
  };

  const bulkToggle = async (activate: boolean) => {
    const ids = Array.from(selected);
    let count = 0;
    for (const id of ids) {
      try {
        const p = properties.find((x) => x._id === id);
        if (p && p.isActive !== activate) {
          await hostApi.togglePropertyStatus(id);
          count++;
        }
      } catch { /* skip */ }
    }
    setSelected(new Set());
    loadProperties();
    toast.success(`${count} propert${count !== 1 ? 'ies' : 'y'} ${activate ? 'activated' : 'deactivated'}`);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!confirm(`Remove ${ids.length} propert${ids.length !== 1 ? 'ies' : 'y'}?`)) return;
    let count = 0;
    for (const id of ids) {
      try { await propertiesApi.delete(id); count++; } catch { /* skip */ }
    }
    setSelected(new Set());
    loadProperties();
    toast.success(`${count} propert${count !== 1 ? 'ies' : 'y'} removed`);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p._id)));
    }
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/listings/${id}`);
    toast.success('Link copied');
    setMenuOpen(null);
  };

  // Unique property types in user's listings
  const propertyTypes = [...new Set(properties.map((p) => p.type))];

  const filtered = properties
    .filter((p) => {
      if (filter === 'active') return p.isActive;
      if (filter === 'inactive') return !p.isActive;
      return true;
    })
    .filter((p) => typeFilter === 'all' || p.type === typeFilter)
    .filter((p) =>
      search
        ? p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.location.city.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'price': cmp = a.pricing.perNight - b.pricing.perNight; break;
        case 'rating': cmp = a.ratings.average - b.ratings.average; break;
        case 'created': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const activeCount = properties.filter((p) => p.isActive).length;
  const inactiveCount = properties.filter((p) => !p.isActive).length;
  const avgRating = properties.length > 0
    ? properties.reduce((s, p) => s + p.ratings.average, 0) / properties.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} total
          </p>
        </div>
        <Link
          href="/host/listings/new"
          className="btn-primary text-sm py-2.5 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Stats Row */}
      {!loading && properties.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: properties.length.toString(), color: 'bg-blue-50 text-blue-600', icon: Building2 },
            { label: 'Active', value: activeCount.toString(), color: 'bg-green-50 text-green-600', icon: ToggleRight },
            { label: 'Inactive', value: inactiveCount.toString(), color: 'bg-gray-50 text-gray-600', icon: ToggleLeft },
            { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', color: 'bg-amber-50 text-amber-600', icon: Star },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Status filter */}
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {f === 'all' ? `All (${properties.length})` : f === 'active' ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
            </button>
          ))}

          {/* Type filter */}
          {propertyTypes.length > 1 && (
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none bg-white"
              >
                <option value="all">All Types</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>{getPropertyTypeLabel(t)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sortField}-${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-');
                setSortField(f as SortField);
                setSortDir(d as SortDir);
              }}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none bg-white"
            >
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
              <option value="title-asc">Name A-Z</option>
              <option value="title-desc">Name Z-A</option>
              <option value="price-desc">Highest Price</option>
              <option value="price-asc">Lowest Price</option>
              <option value="rating-desc">Highest Rating</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors', view === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={cn('p-2 transition-colors', view === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl">
          <span className="text-sm font-semibold text-primary-700">
            {selected.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkToggle(true)} className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors">
              Activate
            </button>
            <button onClick={() => bulkToggle(false)} className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              Deactivate
            </button>
            <button onClick={bulkDelete} className="text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
              Remove
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs font-medium text-gray-500 px-2 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Listings Content */}
      {loading ? (
        <ListingsSkeleton />
      ) : error ? (
        <ErrorState
          title="Couldn't load properties"
          message="We had trouble fetching your listings. Please try again."
          onRetry={loadProperties}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search || filter !== 'all' || typeFilter !== 'all' ? 'No matching properties' : 'No properties yet'}
          description={
            search || filter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'List your first property and start earning with Hostn.'
          }
          actionLabel={!search && filter === 'all' && typeFilter === 'all' ? 'Add Your First Property' : undefined}
          actionHref={!search && filter === 'all' && typeFilter === 'all' ? '/host/listings/new' : undefined}
        />
      ) : view === 'grid' ? (
        /* ─── GRID VIEW ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((property) => (
            <div
              key={property._id}
              className={cn(
                'bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all group',
                selected.has(property._id) ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-100'
              )}
            >
              {/* Image */}
              <div className="relative h-44">
                {property.images[0] ? (
                  <Image
                    src={property.images[0].url}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                {/* Select checkbox */}
                <label className="absolute top-3 left-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(property._id)}
                    onChange={() => toggleSelect(property._id)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                    selected.has(property._id)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white/80 border-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                  )}>
                    {selected.has(property._id) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </label>

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm',
                      property.isActive
                        ? 'bg-green-500/90 text-white'
                        : 'bg-gray-700/70 text-white'
                    )}
                  >
                    {property.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {property.pricing.discountPercent > 0 && (
                  <span className="absolute bottom-3 left-3 bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                    {property.pricing.discountPercent}% OFF
                  </span>
                )}

                {/* Quick actions overlay */}
                <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/listings/${property._id}`}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    title="View listing"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-600" />
                  </Link>
                  <Link
                    href={`/host/listings/${property._id}/edit`}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-600" />
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === property._id ? null : property._id)}
                      className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    {menuOpen === property._id && (
                      <div className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 animate-slide-in">
                        <button
                          onClick={() => copyLink(property._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy link
                        </button>
                        <button
                          onClick={() => toggleStatus(property._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {property.isActive ? (
                            <><ToggleLeft className="w-3.5 h-3.5" /> Deactivate</>
                          ) : (
                            <><ToggleRight className="w-3.5 h-3.5" /> Activate</>
                          )}
                        </button>
                        <button
                          onClick={() => deleteProperty(property._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <Link
                  href={`/host/listings/${property._id}/edit`}
                  className="font-semibold text-gray-900 text-sm line-clamp-1 hover:text-primary-600 transition-colors block mb-1.5"
                >
                  {property.title}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {property.location.district && `${property.location.district}, `}
                    {property.location.city}
                  </span>
                  <span className="text-gray-300 mx-0.5">|</span>
                  <span className="flex-shrink-0">{getPropertyTypeLabel(property.type)}</span>
                </div>

                {/* Property specs */}
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3 pb-3 border-b border-gray-50">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {property.capacity.maxGuests} guests
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-3 h-3" /> {property.capacity.bedrooms} bed
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-3 h-3" /> {property.capacity.bathrooms} bath
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {property.ratings.count > 0 ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        {property.ratings.average.toFixed(1)}
                        <span className="text-gray-400 font-normal">({property.ratings.count})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">No reviews yet</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-primary-600">
                      {formatPrice(property.pricing.perNight)}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-0.5">/night</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── TABLE VIEW ────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 w-10">
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                      />
                    </label>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((property) => (
                  <tr
                    key={property._id}
                    className={cn(
                      'hover:bg-gray-50/50 transition-colors',
                      selected.has(property._id) && 'bg-primary-50/50'
                    )}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(property._id)}
                        onChange={() => toggleSelect(property._id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {property.images[0] ? (
                            <Image src={property.images[0].url} alt="" width={48} height={36} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <Link href={`/host/listings/${property._id}/edit`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-1">
                          {property.title}
                        </Link>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">{property.location.city}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        {getPropertyTypeLabel(property.type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-900">{formatPrice(property.pricing.perNight)}</span>
                      <span className="text-[10px] text-gray-400">/night</span>
                    </td>
                    <td className="p-4">
                      {property.ratings.count > 0 ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-semibold">{property.ratings.average.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs">({property.ratings.count})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(property._id)}
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                          property.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {property.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                        {property.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === property._id ? null : property._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpen === property._id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 animate-slide-in">
                            <Link href={`/listings/${property._id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <ExternalLink className="w-3.5 h-3.5" /> View public page
                            </Link>
                            <Link href={`/host/listings/${property._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Link>
                            <button onClick={() => copyLink(property._id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Copy className="w-3.5 h-3.5" /> Copy link
                            </button>
                            <hr className="border-gray-100" />
                            <button onClick={() => deleteProperty(property._id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Click-away for menus */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
