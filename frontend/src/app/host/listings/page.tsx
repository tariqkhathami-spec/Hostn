'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { propertiesApi, hostApi } from '@/lib/api';
import { Plus, ToggleLeft, ToggleRight, Edit, Loader2, Building } from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface Property {
  _id: string;
  title: string;
  titleAr?: string;
  city: string;
  price: number;
  images?: string[];
  isActive: boolean;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'My Properties', ar: '\u0639\u0642\u0627\u0631\u0627\u062a\u064a' },
  addNew: { en: 'Add New Property', ar: '\u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u0627\u0631 \u062c\u062f\u064a\u062f' },
  active: { en: 'Active', ar: '\u0646\u0634\u0637' },
  inactive: { en: 'Inactive', ar: '\u063a\u064a\u0631 \u0646\u0634\u0637' },
  perNight: { en: 'SAR / night', ar: '\u0631.\u0633 / \u0644\u064a\u0644\u0629' },
  noProperties: { en: 'No properties yet. Add your first property!', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0639\u0642\u0627\u0631\u0643 \u0627\u0644\u0623\u0648\u0644!' },
  edit: { en: 'Edit', ar: '\u062a\u0639\u062f\u064a\u0644' },
  toggled: { en: 'Status updated', ar: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' },
};

export default function HostListingsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'عقاراتي' : 'My Listings');
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
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a' : 'Failed to load properties');
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
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629' : 'Failed to update status');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <div key={property._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-100 relative">
                {property.images && property.images[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <span
                  className={`absolute top-3 end-3 px-2 py-1 rounded-full text-xs font-medium ${
                    property.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {property.isActive ? t.active[lang] : t.inactive[lang]}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {lang === 'ar' && property.titleAr ? property.titleAr : property.title}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{property.city}</p>
                <p className="text-lg font-bold text-primary-600">
                  <span dir="ltr"><SarSymbol /> {property.price?.toLocaleString('en')}</span> / {lang === 'ar' ? 'ليلة' : 'night'}
                </p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <Link
                    href={`/host/listings/${property._id}/edit`}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    {t.edit[lang]}
                  </Link>
                  <button
                    onClick={() => handleToggle(property._id)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    {property.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
