import React from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import PropertyWizard, {
  type PropertyFormData,
  defaultForm,
} from '../../components/property/PropertyWizard';
import { hostService } from '../../services/host.service';
import { getLocale } from '../../utils/i18n';
import { apiErrorMessage } from '../../utils/apiError';
import { parseNumber, parseWhole } from '../../utils/format';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const MAX_DISCOUNT_PERCENT = 90;

/**
 * Wizard form → body of POST /properties/:propertyId/units.
 *
 * Only keys of the Unit model (backend/src/models/Unit.js) are sent: the
 * server drops everything else, which is how units used to be created with
 * no name and a price of zero. The wizard collects one nightly price, so it
 * is applied to all seven days; the host can refine each day on the pricing
 * screen afterwards.
 */
export function buildUnitPayload(form: PropertyFormData): Record<string, unknown> {
  const price = Math.round(parseNumber(form.price) * 100) / 100;
  const cleaningFee = parseNumber(form.cleaningFee);
  const discount = parseNumber(form.discountPercent);
  const bedrooms = Math.max(0, parseWhole(form.bedrooms, 0));

  const pricing: Record<string, number> = {
    cleaningFee: Number.isFinite(cleaningFee) && cleaningFee > 0 ? cleaningFee : 0,
    discountPercent: Number.isFinite(discount) ? Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, discount)) : 0,
  };
  for (const day of DAYS) pricing[day] = price;

  const nameEn = form.nameEn.trim();
  const description = form.description.trim();
  const writtenRules = form.writtenRules.trim();

  // Only real uploaded photos: never a local file path.
  const images = form.images
    .filter((img) => /^https?:\/\//i.test(img.url))
    .map((img) => ({ url: img.url, isPrimary: !!img.isPrimary }));
  if (images.length > 0 && !images.some((img) => img.isPrimary)) images[0].isPrimary = true;

  return {
    nameAr: form.title.trim(),
    ...(nameEn ? { nameEn } : {}),
    ...(description ? { description } : {}),
    ...(writtenRules ? { writtenRules } : {}),
    pricing,
    hasBedrooms: bedrooms > 0,
    bedrooms: { count: bedrooms },
    bathroomCount: Math.max(0, parseWhole(form.bathrooms, 0)),
    capacity: { maxGuests: Math.min(100, Math.max(1, parseWhole(form.maxGuests, 1))) },
    amenities: form.amenities,
    features: form.features,
    images,
  };
}

export default function AddUnitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  // The property this unit belongs to. Its type and location live on the
  // property, so the wizard does not ask for them again.
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => hostService.createUnit(propertyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-units', propertyId] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Unit added successfully', ar: 'تمت إضافة الوحدة بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        apiErrorMessage(error, 'تعذّرت إضافة الوحدة. حاول مرة أخرى.'),
      );
    },
  });

  const handleSubmit = async (form: PropertyFormData) => {
    if (mutation.isPending) return;
    if (!form.title.trim()) {
      Alert.alert('اسم الوحدة مطلوب', 'اكتب اسم الوحدة بالعربية قبل الحفظ.');
      return;
    }
    if (!(parseNumber(form.price) > 0)) {
      Alert.alert('السعر مطلوب', 'أدخل سعراً لليلة أكبر من صفر قبل الحفظ.');
      return;
    }
    if (parseNumber(form.discountPercent || '0') > MAX_DISCOUNT_PERCENT) {
      Alert.alert('نسبة الخصم غير صحيحة', 'نسبة الخصم لا يمكن أن تتجاوز 90%.');
      return;
    }
    mutation.mutate(buildUnitPayload(form));
  };

  // A unit always belongs to a property; without one there is nothing to add to.
  if (!propertyId) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.message}>
          تعذّر تحديد العقار الذي ستُضاف إليه الوحدة. ارجع إلى قائمة العقارات واختر «إضافة وحدة» من بطاقة العقار.
        </Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <PropertyWizard
      mode="unit"
      initialData={{ ...defaultForm }}
      onSubmit={handleSubmit}
      submitLabel={{ en: 'Add Unit', ar: 'إضافة الوحدة' }}
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
    padding: Spacing.xl,
  },
  message: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  button: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  buttonText: { ...Typography.bodyBold, color: Colors.textPrimary },
});
