'use client';

import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';
import UnitForm from '@/components/host/UnitForm';

const t: Record<string, Record<string, string>> = {
  title:   { en: 'New Unit', ar: 'وحدة جديدة' },
  back:    { en: 'Back to Units', ar: 'العودة للوحدات' },
  success: { en: 'Unit created successfully!', ar: 'تم إنشاء الوحدة بنجاح!' },
  error:   { en: 'Failed to create unit', ar: 'فشل في إنشاء الوحدة' },
};

export default function NewUnitPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'وحدة جديدة' : 'New Unit');

  const handleCreate = async (payload: Record<string, unknown>) => {
    try {
      await unitsApi.create(propertyId, payload);
      toast.success(t.success[lang]);
      router.push(`/listings/${propertyId}/units`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(errData?.message || t.error[lang]);
      throw err; // let UnitForm know submission failed
    }
  };

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
        onSubmit={handleCreate}
        submitLabel={{ en: 'Create Unit', ar: 'إنشاء الوحدة' }}
      />
    </div>
  );
}
