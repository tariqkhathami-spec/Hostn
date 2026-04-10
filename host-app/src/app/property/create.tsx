import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PropertyWizard, {
  type PropertyFormData,
} from '../../components/property/PropertyWizard';
import { hostService } from '../../services/host.service';
import { getLocale } from '../../utils/i18n';

export default function CreatePropertyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => hostService.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Property created successfully', ar: 'تم إنشاء العقار بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '';
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        msg || l({ en: 'Failed to create property', ar: 'فشل إنشاء العقار' }),
      );
    },
  });

  const handleSubmit = async (form: PropertyFormData) => {
    const bedrooms = parseInt(form.bedrooms, 10) || 1;
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      type: form.type,
      location: {
        city: form.city,
        district: form.district || undefined,
      },
      pricing: {
        perNight: parseFloat(form.price) || 0,
        cleaningFee: parseFloat(form.cleaningFee) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
      },
      capacity: {
        bedrooms,
        bathrooms: parseInt(form.bathrooms, 10) || 1,
        maxGuests: parseInt(form.maxGuests, 10) || 2,
        beds: bedrooms,
      },
      rules: {
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        minNights: parseInt(form.minNights, 10) || 1,
        maxNights: parseInt(form.maxNights, 10) || 30,
        smokingAllowed: form.smokingAllowed,
        petsAllowed: form.petsAllowed,
        partiesAllowed: form.partiesAllowed,
      },
      amenities: form.amenities,
      images: form.images,
    };
    mutation.mutate(payload);
  };

  return (
    <PropertyWizard
      onSubmit={handleSubmit}
      submitLabel={{ en: 'Create Listing', ar: 'إنشاء الإعلان' }}
      isSubmitting={mutation.isPending}
    />
  );
}
