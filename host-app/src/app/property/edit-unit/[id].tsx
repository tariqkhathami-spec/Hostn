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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../../services/host.service';
import { getLocale } from '../../../utils/i18n';
import { UNIT_AMENITIES, UNIT_FEATURES } from '../../../constants/listings';
import { apiErrorMessage } from '../../../utils/apiError';
import { cleanNumericInput, parseWhole } from '../../../utils/format';
import { pickAndUploadImages, uploadFailureText } from '../../../utils/uploadImages';
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
// Amenities and features come from UNIT_AMENITIES / UNIT_FEATURES, which
// mirror the Unit model enums. A code stored on the unit that this build
// does not know yet is kept on save rather than dropped.
// Photos are saved with the rest of the form (`images` on PUT /units/:id).
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
  description: string;
  amenities: string[];
  features: string[];
  images: UnitImage[];
}

interface UnitImage {
  url: string;
  isPrimary: boolean;
}

const KNOWN_AMENITY_VALUES = new Set(UNIT_AMENITIES.map((a) => a.value));
const KNOWN_FEATURE_VALUES = new Set(UNIT_FEATURES.map((a) => a.value));

/** Exactly one primary photo (the first one when none is marked). */
function withOnePrimary(images: UnitImage[]): UnitImage[] {
  const primaryIndex = Math.max(0, images.findIndex((img) => img.isPrimary));
  return images.map((img, i) => ({ url: img.url, isPrimary: i === primaryIndex }));
}

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
    description: '',
    amenities: [],
    features: [],
    images: [],
  });
  // Codes stored on the unit that this build has no label for — sent back
  // unchanged on save so they are not stripped.
  const [unknownAmenities, setUnknownAmenities] = useState<string[]>([]);
  const [unknownFeatures, setUnknownFeatures] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!unit || hydrated) return;
    const known: string[] = [];
    const unknown: string[] = [];
    for (const a of unit.amenities ?? []) {
      if (KNOWN_AMENITY_VALUES.has(a)) known.push(a);
      else unknown.push(a);
    }
    const knownFeatures = (unit.features ?? []).filter((f) => KNOWN_FEATURE_VALUES.has(f));
    const images: UnitImage[] = [];
    for (const img of unit.images ?? []) {
      const url = typeof img === 'string' ? img : img?.url;
      if (typeof url === 'string' && url) {
        images.push({ url, isPrimary: typeof img === 'object' && !!img.isPrimary });
      }
    }
    setForm({
      nameEn: unit.nameEn ?? '',
      nameAr: unit.nameAr ?? unit.name ?? '',
      area: intStr(unit.area, ''),
      // B3 fix: drop the bogus `?? unit.capacity` fallback that produced
      // `String({...})` = "[object Object]" when capacity was an object
      // missing maxGuests.
      maxGuests: intStr(unit.capacity?.maxGuests, '2'),
      bedroomsCount: intStr(unit.bedrooms?.count, '0'),
      singleBeds: intStr(unit.bedrooms?.singleBeds, '0'),
      doubleBeds: intStr(unit.bedrooms?.doubleBeds, '0'),
      bathroomCount: intStr(unit.bathroomCount, '0'),
      description: unit.description ?? '',
      amenities: known,
      features: knownFeatures,
      images: images.length > 0 ? withOnePrimary(images) : [],
    });
    setUnknownAmenities(unknown);
    setUnknownFeatures((unit.features ?? []).filter((f) => !KNOWN_FEATURE_VALUES.has(f)));
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
    onError: (error: unknown) => {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        apiErrorMessage(error, 'تعذّر حفظ تعديلات الوحدة. حاول مرة أخرى.'),
      );
    },
  });

  const canSubmit = form.nameAr.trim().length > 0 || form.nameEn.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('اسم الوحدة مطلوب', 'اكتب اسم الوحدة بالعربية قبل الحفظ.');
      return;
    }
    if (uploading) {
      Alert.alert('جارٍ رفع الصور', 'انتظر حتى يكتمل رفع الصور ثم احفظ.');
      return;
    }
    const bedrooms = Math.max(0, parseWhole(form.bedroomsCount, 0));
    const area = parseWhole(form.area, 0);
    // Only fields the backend accepts on PUT /units/:id (ALLOWED_UNIT_FIELDS).
    const payload: Record<string, unknown> = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      description: form.description.trim(),
      ...(area > 0 ? { area } : {}),
      capacity: { maxGuests: Math.min(100, Math.max(1, parseWhole(form.maxGuests, 1))) },
      hasBedrooms: bedrooms > 0,
      bedrooms: {
        count: bedrooms,
        singleBeds: Math.max(0, parseWhole(form.singleBeds, 0)),
        doubleBeds: Math.max(0, parseWhole(form.doubleBeds, 0)),
      },
      bathroomCount: Math.max(0, parseWhole(form.bathroomCount, 0)),
      amenities: [...form.amenities, ...unknownAmenities],
      features: [...form.features, ...unknownFeatures],
      images: withOnePrimary(form.images),
    };

    if (form.images.length === 0) {
      Alert.alert(
        'لا توجد صور',
        'الوحدة بدون صور لا تظهر للضيوف. هل تريد الحفظ على أي حال؟',
        [
          { text: 'إضافة صور', style: 'cancel' },
          { text: 'حفظ على أي حال', onPress: () => mutation.mutate(payload) },
        ],
      );
      return;
    }
    mutation.mutate(payload);
  };

  const toggleListValue = (key: 'amenities' | 'features', value: string) => {
    setForm((s) => ({
      ...s,
      [key]: s[key].includes(value) ? s[key].filter((a) => a !== value) : [...s[key], value],
    }));
  };

  // ── Photos ────────────────────────────────────────────────────────────
  const handleAddPhotos = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const result = await pickAndUploadImages((url) => {
        setForm((s) => ({
          ...s,
          images: [...s.images, { url, isPrimary: !s.images.some((img) => img.isPrimary) }],
        }));
      });
      if (result.failed > 0) {
        Alert.alert('تعذّر رفع بعض الصور', uploadFailureText(result));
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر فتح مكتبة الصور. تحقق من صلاحية الوصول للصور.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('حذف الصورة', 'هل تريد حذف هذه الصورة من الوحدة؟ يُطبَّق الحذف عند حفظ التعديلات.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () =>
          setForm((s) => {
            const rest = s.images.filter((_, i) => i !== index);
            return { ...s, images: rest.length > 0 ? withOnePrimary(rest) : [] };
          }),
      },
    ]);
  };

  const handleSetPrimary = (index: number) => {
    setForm((s) => ({
      ...s,
      images: s.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));
  };

  const renderOptionGrid = (
    options: { value: string; en: string; ar: string; icon: string }[],
    key: 'amenities' | 'features',
  ) => (
    <View style={styles.amenityGrid}>
      {options.map((a) => {
        const selected = form[key].includes(a.value);
        return (
          <Pressable
            key={a.value}
            style={[styles.amenityCard, selected && styles.amenityCardActive]}
            onPress={() => toggleListValue(key, a.value)}
          >
            <Ionicons
              name={a.icon as any}
              size={20}
              color={selected ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.amenityLabel, selected && styles.amenityLabelActive]}
              numberOfLines={2}
            >
              {l(a)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {(unit.publishIssues?.length ?? 0) > 0 && (
          <View style={styles.incompleteBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
            <Text style={styles.incompleteText}>
              {`هذه الوحدة غير مكتملة ومخفية عن الضيوف. ينقصها: ${(unit.publishIssues ?? [])
                .map((i) => ({ missing_name: 'الاسم', missing_price: 'السعر', missing_photos: 'الصور' }[i]))
                .filter(Boolean)
                .join('، ')}.`}
            </Text>
          </View>
        )}
        {/* ── Section: Names ──────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          {l({ en: 'Unit name', ar: 'اسم الوحدة' })}
        </Text>

        <Text style={styles.label}>{l({ en: 'Name (Arabic) *', ar: 'الاسم بالعربية *' })}</Text>
        <TextInput
          style={[styles.input, { textAlign: 'right' }]}
          placeholder={l({ en: 'e.g. Chalet 1', ar: 'مثال: شاليه رقم 1' })}
          placeholderTextColor={Colors.textTertiary}
          value={form.nameAr}
          maxLength={200}
          onChangeText={(v) => setForm((s) => ({ ...s, nameAr: v }))}
        />

        <Text style={styles.label}>
          {l({ en: 'Name in English (optional)', ar: 'الاسم بالإنجليزية (اختياري)' })}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Chalet 1"
          placeholderTextColor={Colors.textTertiary}
          value={form.nameEn}
          maxLength={200}
          onChangeText={(v) => setForm((s) => ({ ...s, nameEn: v }))}
        />

        <Text style={styles.label}>{l({ en: 'Description', ar: 'الوصف' })}</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlign: 'right', textAlignVertical: 'top' }]}
          placeholder={l({ en: 'Describe the unit', ar: 'اكتب وصفاً للوحدة' })}
          placeholderTextColor={Colors.textTertiary}
          value={form.description}
          multiline
          maxLength={5000}
          onChangeText={(v) => setForm((s) => ({ ...s, description: v }))}
        />

        {/* ── Section: Photos ─────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Photos', ar: 'الصور' })} ({form.images.length})
        </Text>
        <Text style={styles.sectionHint}>
          {l({
            en: 'A unit needs at least one photo to be visible to guests. Changes apply when you save.',
            ar: 'تحتاج الوحدة إلى صورة واحدة على الأقل لتظهر للضيوف. تُطبَّق التغييرات عند حفظ التعديلات.',
          })}
        </Text>
        <View style={styles.photoGrid}>
          {form.images.map((img, index) => (
            <View key={`${img.url}-${index}`} style={styles.photoCard}>
              <Image source={{ uri: img.url }} style={styles.photoImage} resizeMode="cover" />
              <Pressable
                style={styles.photoRemove}
                hitSlop={8}
                onPress={() => handleRemovePhoto(index)}
                accessibilityLabel="حذف الصورة"
              >
                <Ionicons name="close" size={16} color={Colors.white} />
              </Pressable>
              {img.isPrimary ? (
                <View style={styles.photoPrimaryBadge}>
                  <Text style={styles.photoPrimaryText}>{l({ en: 'Primary', ar: 'الرئيسية' })}</Text>
                </View>
              ) : (
                <Pressable style={styles.photoSetPrimary} onPress={() => handleSetPrimary(index)}>
                  <Text style={styles.photoSetPrimaryText}>
                    {l({ en: 'Set primary', ar: 'تعيين كرئيسية' })}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            style={[styles.photoCard, styles.photoAdd]}
            onPress={handleAddPhotos}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={26} color={Colors.primary} />
                <Text style={styles.photoAddText}>{l({ en: 'Add photos', ar: 'إضافة صور' })}</Text>
              </>
            )}
          </Pressable>
        </View>

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
              onChangeText={(v) => setForm((s) => ({ ...s, maxGuests: cleanNumericInput(v, false) }))}
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
              onChangeText={(v) => setForm((s) => ({ ...s, area: cleanNumericInput(v, false) }))}
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
              onChangeText={(v) => setForm((s) => ({ ...s, bedroomsCount: cleanNumericInput(v, false) }))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.subLabel}>{l({ en: 'Single beds', ar: 'أسرة فردية' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.singleBeds}
              onChangeText={(v) => setForm((s) => ({ ...s, singleBeds: cleanNumericInput(v, false) }))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.subLabel}>{l({ en: 'Double beds', ar: 'أسرة مزدوجة' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.doubleBeds}
              onChangeText={(v) => setForm((s) => ({ ...s, doubleBeds: cleanNumericInput(v, false) }))}
            />
          </View>
        </View>

        <Text style={styles.label}>{l({ en: 'Bathroom count', ar: 'عدد دورات المياه' })}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={form.bathroomCount}
          onChangeText={(v) => setForm((s) => ({ ...s, bathroomCount: cleanNumericInput(v, false) }))}
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
        {renderOptionGrid(UNIT_AMENITIES, 'amenities')}

        {/* ── Section: Features ───────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Features', ar: 'المزايا' })}
        </Text>
        <Text style={styles.sectionHint}>
          {l({ en: `Selected ${form.features.length}`, ar: `تم تحديد ${form.features.length}` })}
        </Text>
        {renderOptionGrid(UNIT_FEATURES, 'features')}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitButton,
            (!canSubmit || mutation.isPending || uploading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
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

  incompleteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '14',
    borderWidth: 1,
    borderColor: Colors.warning + '55',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  incompleteText: { ...Typography.small, color: Colors.textPrimary, flex: 1, lineHeight: 20 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
  },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPrimaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingVertical: 3,
    alignItems: 'center',
  },
  photoPrimaryText: { ...Typography.tiny, color: Colors.white, fontWeight: '700' },
  photoSetPrimary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  photoSetPrimaryText: { ...Typography.tiny, color: Colors.white },
  photoAdd: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

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
