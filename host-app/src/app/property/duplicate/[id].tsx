import React from 'react';
import { Alert, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PropertyWizard, {
  type PropertyFormData,
  defaultForm,
} from '../../../components/property/PropertyWizard';
import { hostService } from '../../../services/host.service';
import { getLocale } from '../../../utils/i18n';
import { Colors, Typography, Spacing } from '../../../constants/theme';

export default function DuplicateUnitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);
  const { id, groupTag } = useLocalSearchParams<{ id: string; groupTag: string }>();

  // Load the source unit/property to clone its data
  const { data: property, isLoading, isError } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      try { return await hostService.getUnit(id!); }
      catch { return await hostService.getProperty(id!); }
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => hostService.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Unit duplicated successfully', ar: 'تم نسخ الوحدة بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '';
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        msg || l({ en: 'Failed to duplicate unit', ar: 'فشل نسخ الوحدة' }),
      );
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{l({ en: 'Loading...', ar: 'جاري التحميل...' })}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>
          {l({ en: 'Failed to load property data', ar: 'فشل تحميل بيانات العقار' })}
        </Text>
      </View>
    );
  }

  // Map property API data to form — clone all settings, clear title for user to rename
  const p: any = property?.data || property;
  const initialData: PropertyFormData = p
    ? {
        title: `${p.title || ''} - ${l({ en: 'Copy', ar: 'نسخة' })}`,
        description: p.description || '',
        type: p.type || '',
        city: p.location?.city || '',
        district: p.location?.district || '',
        price: String(p.pricing?.perNight || ''),
        cleaningFee: String(p.pricing?.cleaningFee || '0'),
        discountPercent: String(p.pricing?.discountPercent || '0'),
        bedrooms: String(p.capacity?.bedrooms || '1'),
        bathrooms: String(p.capacity?.bathrooms || '1'),
        maxGuests: String(p.capacity?.maxGuests || '2'),
        checkInTime: p.rules?.checkInTime || '15:00',
        checkOutTime: p.rules?.checkOutTime || '11:00',
        minNights: String(p.rules?.minNights || '1'),
        maxNights: String(p.rules?.maxNights || '30'),
        smokingAllowed: p.rules?.smokingAllowed || false,
        petsAllowed: p.rules?.petsAllowed || false,
        partiesAllowed: p.rules?.partiesAllowed || false,
        amenities: p.amenities || [],
        images: [], // Don't clone images — host should upload new ones
      }
    : defaultForm;

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
      tags: groupTag ? [groupTag] : [],
    };
    mutation.mutate(payload);
  };

  return (
    <PropertyWizard
      initialData={initialData}
      onSubmit={handleSubmit}
      submitLabel={{ en: 'Duplicate Unit', ar: 'نسخ الوحدة' }}
      isSubmitting={mutation.isPending}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
