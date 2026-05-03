import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../../services/host.service';
import { getLocale } from '../../../utils/i18n';
import { ALL_AMENITIES } from '../../../constants/listings';
import { Colors, Spacing, Typography, Radius } from '../../../constants/theme';
import type { Unit } from '../../../types';

// ---------------------------------------------------------------------------
// Unit edit — Option B (architecture-aligned).
//
// Fixes B2 (payload shape) + B3 (capacity coalesce). Backend Unit shape
// confirmed via curl on /units/:id (see Task 1.2 investigation):
//   - Names: nameEn, nameAr (with virtual `name` aliasing nameAr)
//   - Bedrooms: top-level { count, singleBeds, doubleBeds }
//   - Bathrooms: top-level scalar `bathroomCount`
//   - Capacity: { maxGuests } only
//   - Pricing: per-DOW, edited separately at /pricing/[unitId]
//   - No `rules`, `type`, `location`, `description`, `rooms`, `pricing.perNight`
//     on units — those keys were silently discarded by the pre-fix payload.
//
// Unknown amenity codes (the backend supports a wider vocabulary than
// ALL_AMENITIES encodes) are preserved on save so we don't drop data the
// frontend doesn't yet know how to render.
// ---------------------------------------------------------------------------

interface UnitFormState {
  nameEn: string;
  nameAr: string;
  area: string;
  maxGuests: string;
  bedroomsCount: string;
  singleBeds: string;
  doubleBeds: string;
  bathroomCount: string;
  amenities: string[];
}

const KNOWN_AMENITY_VALUES = new Set(ALL_AMENITIES.map((a) => a.value));

const intStr = (v: number | string | undefined, fallback: string) =>
  v === undefined || v === null ? fallback : String(v);

export default function EditUnitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const isAr = locale === 'ar';
  const l = (obj: { en: string; ar: string }) => (isAr ? obj.ar : obj.en);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => hostService.getUnit(id!),
    enabled: !!id,
    retry: false,
  });

  const unit: Unit | undefined = (data as any)?.data ?? data;

  const [form, setForm] = useState<UnitFormState>({
    nameEn: '',
    nameAr: '',
    area: '',
    maxGuests: '2',
    bedroomsCount: '1',
    singleBeds: '0',
    doubleBeds: '0',
    bathroomCount: '1',
    amenities: [],
  });
  // Amenity codes present on the unit but not in our ALL_AMENITIES catalog —
  // round-tripped through the form invisibly so we don't strip them on save.
  const [unknownAmenities, setUnknownAmenities] = useState<string[]>([]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!unit || hydrated) return;
    const known: string[] = [];
    const unknown: string[] = [];
    for (const a of unit.amenities ?? []) {
      if (KNOWN_AMENITY_VALUES.has(a)) known.push(a);
      else unknown.push(a);
    }
    setForm({
      nameEn: unit.nameEn ?? '',
      nameAr: unit.nameAr ?? unit.name ?? '',
      area: intStr(unit.area, ''),
      // B3 fix: drop the bogus `?? unit.capacity` fallback that produced
      // `String({...})` = "[object Object]" when capacity was an object
      // missing maxGuests.
      maxGuests: intStr(unit.capacity?.maxGuests, '2'),
      bedroomsCount: intStr(unit.bedrooms?.count, '1'),
      singleBeds: intStr(unit.bedrooms?.singleBeds, '0'),
      doubleBeds: intStr(unit.bedrooms?.doubleBeds, '0'),
      bathroomCount: intStr(unit.bathroomCount, '1'),
      amenities: known,
    });
    setUnknownAmenities(unknown);
    setHydrated(true);
  }, [unit, hydrated]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.updateUnit(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      Alert.alert(
        l({ en: 'Saved', ar: 'تم الحفظ' }),
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

  const canSubmit = form.nameEn.trim().length > 0 || form.nameAr.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Only fields the backend actually accepts on PUT /units/:id. Anything
    // else (rules, type, location, description, rooms, pricing.perNight) is
    // silently dropped server-side, which is what made the pre-fix saves
    // appear to succeed while losing data.
    const payload: Record<string, unknown> = {
      nameEn: form.nameEn.trim() || undefined,
      nameAr: form.nameAr.trim() || undefined,
      area: parseInt(form.area, 10) || undefined,
      capacity: { maxGuests: parseInt(form.maxGuests, 10) || 1 },
      bedrooms: {
        count: parseInt(form.bedroomsCount, 10) || 1,
        singleBeds: parseInt(form.singleBeds, 10) || 0,
        doubleBeds: parseInt(form.doubleBeds, 10) || 0,
      },
      bathroomCount: parseInt(form.bathroomCount, 10) || 1,
      amenities: [...form.amenities, ...unknownAmenities],
    };
    mutation.mutate(payload);
  };

  const toggleAmenity = (value: string) => {
    setForm((s) => ({
      ...s,
      amenities: s.amenities.includes(value)
        ? s.amenities.filter((a) => a !== value)
        : [...s.amenities, value],
    }));
  };

  const handleManagePricing = () => {
    if (!id) return;
    router.push({ pathname: '/pricing/[unitId]', params: { unitId: id } });
  };

  // -------------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.subtleText}>
          {l({ en: 'Loading...', ar: 'جاري التحميل...' })}
        </Text>
      </View>
    );
  }

  if (isError || !unit) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>
          {l({ en: 'Failed to load unit', ar: 'فشل تحميل بيانات الوحدة' })}
        </Text>
        <Pressable style={styles.smallButton} onPress={() => router.back()}>
          <Text style={styles.smallButtonText}>{l({ en: 'Back', ar: 'رجوع' })}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {l({ en: 'Edit Unit', ar: 'تعديل الوحدة' })}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Section: Names ──────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          {l({ en: 'Unit name', ar: 'اسم الوحدة' })}
        </Text>

        <Text style={styles.label}>{l({ en: 'Name (English)', ar: 'الاسم (إنجليزي)' })}</Text>
        <TextInput
          style={styles.input}
          placeholder={l({ en: 'e.g. Deluxe Suite', ar: 'مثال: جناح فاخر' })}
          placeholderTextColor={Colors.textTertiary}
          value={form.nameEn}
          onChangeText={(v) => setForm((s) => ({ ...s, nameEn: v }))}
        />

        <Text style={styles.label}>{l({ en: 'Name (Arabic)', ar: 'الاسم (عربي)' })}</Text>
        <TextInput
          style={[styles.input, { textAlign: 'right' }]}
          placeholder={l({ en: 'الاسم بالعربي', ar: 'الاسم بالعربي' })}
          placeholderTextColor={Colors.textTertiary}
          value={form.nameAr}
          onChangeText={(v) => setForm((s) => ({ ...s, nameAr: v }))}
        />

        {/* ── Section: Capacity ───────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Capacity', ar: 'السعة' })}
        </Text>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{l({ en: 'Max guests', ar: 'الحد الأقصى للضيوف' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.maxGuests}
              onChangeText={(v) => setForm((s) => ({ ...s, maxGuests: v }))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{l({ en: 'Area (m²)', ar: 'المساحة (م²)' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={Colors.textTertiary}
              value={form.area}
              onChangeText={(v) => setForm((s) => ({ ...s, area: v }))}
            />
          </View>
        </View>

        <Text style={styles.label}>{l({ en: 'Bedrooms', ar: 'غرف النوم' })}</Text>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.subLabel}>{l({ en: 'Count', ar: 'العدد' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.bedroomsCount}
              onChangeText={(v) => setForm((s) => ({ ...s, bedroomsCount: v }))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.subLabel}>{l({ en: 'Single beds', ar: 'أسرة فردية' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.singleBeds}
              onChangeText={(v) => setForm((s) => ({ ...s, singleBeds: v }))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.subLabel}>{l({ en: 'Double beds', ar: 'أسرة مزدوجة' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.doubleBeds}
              onChangeText={(v) => setForm((s) => ({ ...s, doubleBeds: v }))}
            />
          </View>
        </View>

        <Text style={styles.label}>{l({ en: 'Bathroom count', ar: 'عدد دورات المياه' })}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={form.bathroomCount}
          onChangeText={(v) => setForm((s) => ({ ...s, bathroomCount: v }))}
        />

        {/* ── Section: Manage pricing (link out) ──────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Pricing', ar: 'الأسعار' })}
        </Text>
        <Text style={styles.sectionHint}>
          {l({
            en: 'Per-night pricing is configured per day-of-week on a separate screen.',
            ar: 'يتم تحديد سعر الليلة لكل يوم من أيام الأسبوع على شاشة منفصلة.',
          })}
        </Text>
        <Pressable style={styles.linkRow} onPress={handleManagePricing}>
          <View style={styles.linkRowLeft}>
            <Ionicons name="pricetags-outline" size={20} color={Colors.primary} />
            <Text style={styles.linkRowText}>
              {l({ en: 'Manage pricing', ar: 'إدارة الأسعار' })}
            </Text>
          </View>
          <Ionicons
            name={isAr ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={Colors.textTertiary}
          />
        </Pressable>

        {/* ── Section: Amenities ──────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Amenities', ar: 'المرافق' })}
        </Text>
        <Text style={styles.sectionHint}>
          {l({
            en: `Selected ${form.amenities.length}${
              unknownAmenities.length > 0 ? ` (+${unknownAmenities.length} additional preserved)` : ''
            }`,
            ar: `تم تحديد ${form.amenities.length}${
              unknownAmenities.length > 0
                ? ` (+${unknownAmenities.length} مرافق إضافية محفوظة)`
                : ''
            }`,
          })}
        </Text>
        <View style={styles.amenityGrid}>
          {ALL_AMENITIES.map((a) => {
            const selected = form.amenities.includes(a.value);
            return (
              <Pressable
                key={a.value}
                style={[styles.amenityCard, selected && styles.amenityCardActive]}
                onPress={() => toggleAmenity(a.value)}
              >
                <Ionicons
                  name={a.icon as any}
                  size={20}
                  color={selected ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.amenityLabel,
                    selected && styles.amenityLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {l(a)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitButton,
            (!canSubmit || mutation.isPending) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {l({ en: 'Save changes', ar: 'حفظ التعديلات' })}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  subtleText: { ...Typography.small, color: Colors.textSecondary },
  errorText: { ...Typography.body, color: Colors.error, textAlign: 'center' },
  smallButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  smallButtonText: { ...Typography.bodyBold, color: Colors.textPrimary },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.xl, paddingBottom: 120 },

  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  label: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  subLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
  },

  row: { flexDirection: 'row', gap: Spacing.md },
  rowItem: { flex: 1 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '0A',
  },
  linkRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  linkRowText: { ...Typography.bodyBold, color: Colors.primary },

  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amenityCard: {
    width: '30%',
    aspectRatio: 1.4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    gap: 4,
    paddingHorizontal: 4,
  },
  amenityCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0D',
  },
  amenityLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  amenityLabelActive: { color: Colors.primary, fontWeight: '600' },

  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { ...Typography.bodyBold, color: Colors.white },
});
