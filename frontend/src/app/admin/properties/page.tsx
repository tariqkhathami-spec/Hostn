'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface PropertyRaw {
  _id: string;
  title: string;
  host?: { name: string };
  hostName?: string;
  location?: { city?: string };
  city?: string;
  isActive?: boolean;
  isApproved?: boolean;
  status?: string;
  createdAt: string;
}

interface PropertyItem {
  _id: string;
  title: string;
  host?: { name: string };
  hostName?: string;
  city: string;
  status: string;
  createdAt: string;
}

function deriveStatus(p: PropertyRaw): string {
  if (p.status) return p.status;
  if (p.isApproved === false) return 'pending';
  if (p.isActive === false) return 'removed';
  return 'active';
}

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  flagged: 'bg-yellow-50 text-yellow-700',
  removed: 'bg-red-50 text-red-700',
  pending: 'bg-blue-50 text-blue-700',
};

export default function AdminPropertiesPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'العقارات' : 'Properties');

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProperties({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      });
      const data = res.data;
      const raw: PropertyRaw[] = data.data || data.properties || [];
      setProperties(raw.map((p) => ({
        _id: p._id,
        title: p.title,
        host: p.host,
        hostName: p.hostName,
        city: p.location?.city || p.city || '-',
        status: deriveStatus(p),
        createdAt: p.createdAt,
      })));
      setTotalPages(data.pagination?.pages || data.totalPages || Math.ceil((data.total || 0) / 20) || 1);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, isAr]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const moderate = async (id: string, status: string) => {
    const reason = status === 'removed' ? prompt(isAr ? '\u0633\u0628\u0628 \u0627\u0644\u0625\u0632\u0627\u0644\u0629:' : 'Reason for removal:') : undefined;
    if (status === 'removed' && !reason) return;

    const action = status === 'active' ? 'approve' : 'reject';
    setActionId(id);
    try {
      await adminApi.moderateProperty(id, { action, reason: reason || '' });
      toast.success(
        status === 'active'
          ? (isAr ? '\u062a\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629' : 'Property approved')
          : (isAr ? '\u062a\u0645 \u0627\u0644\u0625\u0632\u0627\u0644\u0629' : 'Property removed')
      );
      loadProperties();
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b' : 'Failed to update');
    } finally {
      setActionId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProperties();
  };

  const statusLabels: Record<string, string> = isAr
    ? { active: '\u0646\u0634\u0637', flagged: '\u0645\u0628\u0644\u063a \u0639\u0646\u0647', removed: '\u0645\u062d\u0630\u0648\u0641', pending: '\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629' }
    : { active: 'Active', flagged: 'Flagged', removed: 'Removed', pending: 'Pending' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Property Moderation'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Review and moderate properties'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? '\u0628\u062d\u062b \u0628\u0627\u0644\u0639\u0646\u0648\u0627\u0646...' : 'Search by title...'}
            className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">{isAr ? '\u0627\u0644\u0643\u0644' : 'All Statuses'}</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0639\u0642\u0627\u0631\u0627\u062a' : 'No properties found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' : 'Title'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0645\u0636\u064a\u0641' : 'Host'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0645\u062f\u064a\u0646\u0629' : 'City'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621' : 'Created'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0625\u062c\u0631\u0627\u0621\u0627\u062a' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((prop) => (
                  <tr key={prop._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{prop.title}</td>
                    <td className="px-4 py-3 text-gray-600">{prop.host?.name || prop.hostName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{prop.city}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[prop.status] || 'bg-gray-50 text-gray-700'}`}>
                        {statusLabels[prop.status] || prop.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(prop.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {prop.status !== 'active' && (
                          <button
                            onClick={() => moderate(prop._id, 'active')}
                            disabled={actionId === prop._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {actionId === prop._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            {isAr ? '\u0645\u0648\u0627\u0641\u0642\u0629' : 'Approve'}
                          </button>
                        )}
                        {prop.status !== 'removed' && (
                          <button
                            onClick={() => moderate(prop._id, 'removed')}
                            disabled={actionId === prop._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {actionId === prop._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            {isAr ? '\u0625\u0632\u0627\u0644\u0629' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
