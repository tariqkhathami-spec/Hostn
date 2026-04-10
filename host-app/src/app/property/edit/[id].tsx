import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PropertyWizard, {
  defaultForm,
  type PropertyFormData,
} from '../../../components/property/PropertyWizard';
import { hostService } from '../../../services/host.service';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { getLocale } from '../../../utils/i18n';

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['property', id],
    queryFn: () => hostService.getProperty(id!),
    enabled: !!id,
    retry: false,
  });

  const property: any = data?.data;

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.updateProperty(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Property updated successfully', ar: 'تم تحديث العقار بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '';
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        msg || l({ en: 'Failed to update property', ar: 'فشل تحديث العقار' }),
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{l({ en: 'Loading...', ar: 'جاري التحميل...' })}</Text>
      </View>
    );
  }

  if (isError || !property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {l({ en: 'Failed to load property', ar: 'فشل تحميل بيانات العقار' })}
        </Text>
      </View>
    );
  }

  // Map API property data to form shape
  const initialData: PropertyFormData = {
    title: property.title || property.name || property.nameAr || '',
    description: property.description || '',
    type: property.type || '',
    city: property.city || property.address?.city || '',
    district: property.district || property.address?.district || '',
    price: String(property.price || ''),
    cleaningFee: String(property.cleaningFee ?? '0'),
    discountPercent: String(property.discountPercent ?? '0'),
    bedrooms: String(property.bedrooms ?? '1'),
    bathrooms: String(property.bathrooms ?? '1'),
    maxGuests: String(property.maxGuests ?? '2'),
    checkInTime: property.checkInTime || '15:00',
    checkOutTime: property.checkOutTime || '11:00',
    minNights: String(property.minNights ?? '1'),
    maxNights: String(property.maxNights ?? '30'),
    smokingAllowed: property.smokingAllowed ?? false,
    petsAllowed: property.petsAllowed ?? false,
    partiesAllowed: property.partiesAllowed ?? false,
    amenities: property.amenities || [],
    images: property.images?.map((img: any) =>
      typeof img === 'string'
        ? { url: img, isPrimary: false }
        : { url: img.url, isPrimary: img.isPrimary ?? false },
    ) || [],
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
