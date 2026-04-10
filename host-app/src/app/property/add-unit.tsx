import React from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PropertyWizard, {
  type PropertyFormData,
  defaultForm,
} from '../../components/property/PropertyWizard';
import { hostService } from '../../services/host.service';
import { getLocale } from '../../utils/i18n';

export default function AddUnitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  // Get parent property info from route params
  const { propertyId, groupTag, city, district, type } = useLocalSearchParams<{
    propertyId: string;
    groupTag: string;
    city: string;
    district: string;
    type: string;
  }>();

  // Pre-fill form with parent property's location and type
  const initialData: PropertyFormData = {
    ...defaultForm,
    type: type || '',
    city: city || '',
    district: district || '',
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      // Use new Unit API when propertyId is provided, fall back to legacy
      if (propertyId) {
        return hostService.createUnit(propertyId, data);
      }
      // Legacy path: create as property with groupTag for backward compat
      return hostService.createProperty(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      if (propertyId) {
        queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      }
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Unit added successfully', ar: 'تمت إضافة الوحدة بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '';
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        msg || l({ en: 'Failed to add unit', ar: 'فشل إضافة الوحدة' }),
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

    // Legacy groupTag path for backward compat when no propertyId
    if (!propertyId && groupTag) {
      payload.tags = [groupTag];
    }

    mutation.mutate(payload);
  };

  return (
    <PropertyWizard
      initialData={initialData}
      onSubmit={handleSubmit}
      submitLabel={{ en: 'Add Unit', ar: 'إضافة وحدة' }}
      isSubmitting={mutation.isPending}
    />
  );
}
