import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PropertyWizard, {
  type PropertyFormData,
} from '../../../components/property/PropertyWizard';
import { hostService } from '../../../services/host.service';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { getLocale } from '../../../utils/i18n';

export default function EditUnitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => hostService.getUnit(id!),
    enabled: !!id,
    retry: false,
  });

  const unit: any = data?.data ?? data;

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.updateUnit(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['unit', id] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Unit updated successfully', ar: 'تم تحديث الوحدة بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '';
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        msg || l({ en: 'Failed to update unit', ar: 'فشل تحديث الوحدة' }),
      );
    },
  });

  const handleSubmit = async (form: PropertyFormData) => {
    const bedrooms = parseInt(form.bedrooms, 10) || 1;
    const payload: Record<string, unknown> = {
      name: form.title,
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
      rooms: {
        bedrooms,
        bathrooms: parseInt(form.bathrooms, 10) || 1,
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{l({ en: 'Loading...', ar: 'جاري التحميل...' })}</Text>
      </View>
    );
  }

  if (isError || !unit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {l({ en: 'Failed to load unit', ar: 'فشل تحميل بيانات الوحدة' })}
        </Text>
      </View>
    );
  }

  // Map API unit data to PropertyWizard form shape
  const initialData: PropertyFormData = {
    title: unit.name || unit.nameEn || unit.nameAr || '',
    description: unit.description || '',
    type: unit.type || '',
    city: unit.city || unit.address?.city || unit.location?.city || '',
    district: unit.district || unit.address?.district || unit.location?.district || '',
    price: String(
      unit.price ?? unit.pricing?.perNight ?? unit.pricing?.midWeek ?? '',
    ),
    cleaningFee: String(unit.cleaningFee ?? unit.pricing?.cleaningFee ?? '0'),
    discountPercent: String(unit.discountPercent ?? unit.pricing?.discountPercent ?? '0'),
    bedrooms: String(unit.rooms?.bedrooms ?? unit.capacity?.bedrooms ?? unit.bedrooms ?? '1'),
    bathrooms: String(unit.rooms?.bathrooms ?? unit.capacity?.bathrooms ?? unit.bathrooms ?? '1'),
    maxGuests: String(unit.capacity?.maxGuests ?? unit.capacity ?? '2'),
    checkInTime: unit.checkInTime ?? unit.rules?.checkInTime ?? '15:00',
    checkOutTime: unit.checkOutTime ?? unit.rules?.checkOutTime ?? '11:00',
    minNights: String(unit.minNights ?? unit.rules?.minNights ?? '1'),
    maxNights: String(unit.maxNights ?? unit.rules?.maxNights ?? '30'),
    smokingAllowed: unit.smokingAllowed ?? unit.rules?.smokingAllowed ?? false,
    petsAllowed: unit.petsAllowed ?? unit.rules?.petsAllowed ?? false,
    partiesAllowed: unit.partiesAllowed ?? unit.rules?.partiesAllowed ?? false,
    amenities: unit.amenities || [],
    images: (unit.images || unit.photos || []).map((img: any) =>
      typeof img === 'string'
        ? { url: img, isPrimary: false }
        : { url: img.url, isPrimary: img.isPrimary ?? false },
    ),
  };

  // Ensure at least one image is primary
  if (initialData.images.length > 0 && !initialData.images.some((i) => i.isPrimary)) {
    initialData.images[0].isPrimary = true;
  }

  return (
    <PropertyWizard
      initialData={initialData}
      onSubmit={handleSubmit}
      submitLabel={{ en: 'Save Changes', ar: 'حفظ التعديلات' }}
      isSubmitting={mutation.isPending}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
  },
});
