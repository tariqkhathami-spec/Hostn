'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import UnitForm, { UnitFormData, defaultFormData, PoolEntry } from '@/components/host/UnitForm';

const t: Record<string, Record<string, string>> = {
  title:     { en: 'Edit Unit', ar: 'تعديل الوحدة' },
  back:      { en: 'Back to Units', ar: 'العودة للوحدات' },
  success:   { en: 'Unit updated successfully!', ar: 'تم تحديث الوحدة بنجاح!' },
  error:     { en: 'Failed to update unit', ar: 'فشل في تحديث الوحدة' },
  loadError: { en: 'Failed to load unit', ar: 'فشل في تحميل الوحدة' },
};

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'تعديل الوحدة' : 'Edit Unit');

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UnitFormData>(defaultFormData);
  const [images, setImages] = useState<{ url: string; isPrimary: boolean }[]>([]);
  const [bathroomAmenities, setBathroomAmenities] = useState<string[]>([]);
  const [kitchenAmenities, setKitchenAmenities] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [pools, setPools] = useState<PoolEntry[]>([]);

  useEffect(() => { loadUnit(); }, [unitId]);

  const loadUnit = async () => {
    try {
      const res = await unitsApi.getOne(unitId);
      const u = res.data.data || res.data;

      setFormData({
        nameEn: u.nameEn || '',
        nameAr: u.nameAr || '',
        description: u.description || '',
        area: u.area ? String(u.area) : '',
        suitability: u.suitability || 'both',
        depositPercent: String(u.depositPercent ?? 0),
        insuranceOnArrival: u.insuranceOnArrival || false,
        insuranceAmount: String(u.insuranceAmount ?? 0),
        cancellationPolicy: u.cancellationPolicy || 'flexible',
        cancellationDescription: u.cancellationDescription || '',
        writtenRules: u.writtenRules || '',
        hasLivingRooms: u.hasLivingRooms || false,
        livingMain: String(u.livingRooms?.main ?? 0),
        livingAdditional: String(u.livingRooms?.additional ?? 0),
        livingOutdoor: String(u.livingRooms?.outdoor ?? 0),
        livingOutdoorRoom: String(u.livingRooms?.outdoorRoom ?? 0),
        hasBedrooms: u.hasBedrooms || false,
        bedroomCount: String(u.bedrooms?.count ?? 0),
        singleBeds: String(u.bedrooms?.singleBeds ?? 0),
        doubleBeds: String(u.bedrooms?.doubleBeds ?? 0),
        bathroomCount: String(u.bathroomCount ?? 0),
        hasKitchen: u.hasKitchen || false,
        diningCapacity: String(u.kitchen?.diningCapacity ?? 0),
        hasPool: u.hasPool || false,
        priceSun: String(u.pricing?.sunday ?? 0),
        priceMon: String(u.pricing?.monday ?? 0),
        priceTue: String(u.pricing?.tuesday ?? 0),
        priceWed: String(u.pricing?.wednesday ?? 0),
        priceThu: String(u.pricing?.thursday ?? 0),
        priceFri: String(u.pricing?.friday ?? 0),
        priceSat: String(u.pricing?.saturday ?? 0),
        cleaningFee: String(u.pricing?.cleaningFee ?? 0),
        discountPercent: String(u.pricing?.discountPercent ?? 0),
        weeklyDiscount: String(u.pricing?.weeklyDiscount ?? 0),
        maxGuests: String(u.capacity?.maxGuests ?? 1),
      });

      setImages(
        (u.images || []).map((img: { url: string; isPrimary?: boolean }) => ({
          url: img.url,
          isPrimary: img.isPrimary || false,
        }))
      );
      setBathroomAmenities(u.bathroomAmenities || []);
      setKitchenAmenities(u.kitchen?.amenities || []);
      setAmenities(u.amenities || []);
      setFeatures(u.features || []);
      setPools(
        (u.pools || []).map((p: PoolEntry) => ({
          _id: p._id,
          type: p.type,
          variableDepth: p.variableDepth || false,
          depthMin: p.depthMin,
          depthMax: p.depthMax,
          depth: p.depth,
          lengthM: p.lengthM,
          widthM: p.widthM,
          isEmpty: p.isEmpty || false,
        }))
      );
    } catch {
      toast.error(t.loadError[lang]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (payload: Record<string, unknown>) => {
    try {
      await unitsApi.update(unitId, payload);
      toast.success(t.success[lang]);
      router.push(`/listings/${propertyId}/units`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(errData?.message || t.error[lang]);
      throw err;
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
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/listings/${propertyId}/units`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.back[lang]}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      <UnitForm
        initialData={formData}
        initialImages={images}
        initialBathroomAmenities={bathroomAmenities}
        initialKitchenAmenities={kitchenAmenities}
        initialAmenities={amenities}
        initialFeatures={features}
        initialPools={pools}
        onSubmit={handleUpdate}
        submitLabel={{ en: 'Save Changes', ar: 'حفظ التغييرات' }}
      />
    </div>
  );
}
