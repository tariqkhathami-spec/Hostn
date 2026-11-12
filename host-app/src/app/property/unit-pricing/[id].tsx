import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START, DirectionalIcon } from '../../../constants/theme';
import { hostService } from '../../../services/host.service';
import { getLocale } from '../../../utils/i18n';
import { apiErrorMessage } from '../../../utils/apiError';
import { cleanNumericInput, parseNumber } from '../../../utils/format';

const MAX_DISCOUNT_PERCENT = 90;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function UnitPricingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const isAr = locale === 'ar';
  const l = (obj: { en: string; ar: string }) => (isAr ? obj.ar : obj.en);

  // Per-day prices
  const [prices, setPrices] = useState<Record<string, string>>({
    sunday: '',
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
  });
  const [cleaningFee, setCleaningFee] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['unit-pricing', id],
    queryFn: () => hostService.getUnit(id!),
    enabled: !!id,
    retry: false,
  });

  // Pre-populate from fetched data
  useEffect(() => {
    if (!data) return;
    const raw = data.data ?? data;
    const pricing = raw.pricing ?? raw;
    const newPrices: Record<string, string> = {};
    for (const key of DAY_KEYS) {
      newPrices[key] = String(pricing[key] ?? '');
    }
    // Fallback: if pricing uses midWeek/thursday/friday/saturday pattern
    if (pricing.midWeek != null && !pricing.sunday) {
      newPrices.sunday = String(pricing.midWeek ?? '');
      newPrices.monday = String(pricing.midWeek ?? '');
      newPrices.tuesday = String(pricing.midWeek ?? '');
      newPrices.wednesday = String(pricing.midWeek ?? '');
      newPrices.thursday = String(pricing.thursday ?? pricing.midWeek ?? '');
      newPrices.friday = String(pricing.friday ?? pricing.midWeek ?? '');
      newPrices.saturday = String(pricing.saturday ?? pricing.midWeek ?? '');
    }
    setPrices(newPrices);
    setCleaningFee(String(pricing.cleaningFee ?? '0'));
    setDiscountPercent(String(Math.min(MAX_DISCOUNT_PERCENT, Number(pricing.discountPercent) || 0)));
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      hostService.updateUnitPricing(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-pricing', id] });
      queryClient.invalidateQueries({ queryKey: ['unitPricing', id] });
      queryClient.invalidateQueries({ queryKey: ['unitDiscounts', id] });
      queryClient.invalidateQueries({ queryKey: ['unit', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({ en: 'Pricing updated successfully', ar: 'تم تحديث الأسعار بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        apiErrorMessage(error, 'تعذّر حفظ الأسعار. حاول مرة أخرى.'),
      );
    },
  });

  const handleSave = () => {
    // An empty field counts as 0; anything else must be a valid number.
    const dayPrices: Record<string, number> = {};
    for (const key of DAY_KEYS) {
      const val = prices[key].trim() === '' ? 0 : parseNumber(prices[key]);
      if (!Number.isFinite(val) || val < 0) {
        Alert.alert(
          l({ en: 'Error', ar: 'خطأ' }),
          l({ en: 'Prices must be valid non-negative numbers', ar: 'يجب أن تكون الأسعار أرقاماً صحيحة وغير سالبة' }),
        );
        return;
      }
      dayPrices[key] = Math.round(val * 100) / 100;
    }
    const cfVal = cleaningFee.trim() === '' ? 0 : parseNumber(cleaningFee);
    if (!Number.isFinite(cfVal) || cfVal < 0) {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        l({ en: 'Cleaning fee must be a valid non-negative number', ar: 'يجب أن تكون رسوم التنظيف رقماً صحيحاً وغير سالب' }),
      );
      return;
    }
    const discount = discountPercent.trim() === '' ? 0 : parseNumber(discountPercent);
    if (!Number.isFinite(discount) || discount < 0 || discount > MAX_DISCOUNT_PERCENT) {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        l({ en: 'Discount must be between 0 and 90', ar: 'نسبة الخصم يجب أن تكون بين 0 و 90' }),
      );
      return;
    }

    // PUT /units/:id/pricing reads the day prices from `pricing` (merged
    // into the stored pricing, so other discount settings are kept).
    const payload: Record<string, unknown> = {
      pricing: { ...dayPrices, cleaningFee: cfVal, discountPercent: discount },
    };

    // A unit with any day at 0 is hidden from guests — make sure that is intended.
    if (DAY_KEYS.some((key) => dayPrices[key] <= 0)) {
      Alert.alert(
        'يوجد يوم بدون سعر',
        'الوحدة لا تظهر للضيوف إلا إذا كان لكل يوم من أيام الأسبوع سعر أكبر من صفر. هل تريد الحفظ على أي حال؟',
        [
          { text: 'تعديل الأسعار', style: 'cancel' },
          { text: 'حفظ على أي حال', onPress: () => mutation.mutate(payload) },
        ],
      );
      return;
    }
    mutation.mutate(payload);
  };

  const updatePrice = (key: string, value: string) => {
    setPrices((prev) => ({ ...prev, [key]: cleanNumericInput(value) }));
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {l({ en: 'Loading...', ar: 'جاري التحميل...' })}
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {l({ en: 'Failed to load pricing', ar: 'فشل تحميل بيانات الأسعار' })}
        </Text>
      </View>
    );
  }

  const dayLabels = isAr ? DAY_LABELS_AR : DAY_LABELS_EN;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name={DirectionalIcon.back} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {l({ en: 'Unit Pricing', ar: 'تسعير الوحدة' })}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Default prices section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {l({ en: 'Daily Prices (SAR)', ar: 'الأسعار اليومية (ريال)' })}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {l({
              en: 'Set the default price for each day of the week',
              ar: 'حدد السعر الافتراضي لكل يوم من أيام الأسبوع',
            })}
          </Text>

          {DAY_KEYS.map((key, idx) => (
            <View key={key} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{dayLabels[idx]}</Text>
              <TextInput
                style={styles.priceInput}
                value={prices[key]}
                onChangeText={(v) => updatePrice(key, v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          ))}
        </View>

        {/* Cleaning fee & Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {l({ en: 'Additional Fees', ar: 'رسوم إضافية' })}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {l({ en: 'Cleaning Fee (SAR)', ar: 'رسوم التنظيف (ريال)' })}
            </Text>
            <TextInput
              style={styles.priceInput}
              value={cleaningFee}
              onChangeText={(v) => setCleaningFee(cleanNumericInput(v))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {l({ en: 'Discount % (0–90)', ar: 'نسبة الخصم % (من 0 إلى 90)' })}
            </Text>
            <TextInput
              style={styles.priceInput}
              value={discountPercent}
              onChangeText={(v) => {
                const cleaned = cleanNumericInput(v);
                setDiscountPercent(
                  parseNumber(cleaned) > MAX_DISCOUNT_PERCENT ? String(MAX_DISCOUNT_PERCENT) : cleaned,
                );
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.saveButton, mutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {l({ en: 'Save Pricing', ar: 'حفظ الأسعار' })}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginBottom: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  priceLabel: {
    ...Typography.small,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: TEXT_START,
  },
  priceInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: 120,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 34,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
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
