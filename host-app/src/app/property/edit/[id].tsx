import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../../services/host.service';
import { useAuthStore } from '../../../store/authStore';
import { getLocale } from '../../../utils/i18n';
import {
  CITIES,
  PROPERTY_TYPES,
  DIRECTIONS,
  TIME_OPTIONS,
  OTHER_DISTRICT,
  districtOptionsFor,
  isListedDistrict,
  districtLabel,
  normalizeCity,
} from '../../../constants/listings';
import { apiErrorMessage } from '../../../utils/apiError';
import { cleanNumericInput, parseWhole } from '../../../utils/format';
import { Colors, Spacing, Typography, Radius } from '../../../constants/theme';
import type { Property, PropertyRules, Unit } from '../../../types';

// ---------------------------------------------------------------------------
// Property edit — metadata + stay rules + units list (B3 architecture).
//
// Property is a container + stay rules. Bookable fields (pricing, capacity,
// rooms, amenities, images) live on Unit and are edited via
// /property/edit-unit/[id]. The Units section here lists the property's units
// with per-unit Edit buttons that route there.
// ---------------------------------------------------------------------------

const DEFAULT_RULES: PropertyRules = {
  checkInTime: '14:00',
  checkOutTime: '12:00',
  minNights: 1,
  maxNights: 30,
  smokingAllowed: false,
  petsAllowed: false,
  partiesAllowed: false,
};

const timeOptions = TIME_OPTIONS.map((t) => ({ value: t, en: t, ar: t }));

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const isAr = locale === 'ar';
  const l = (obj: { en: string; ar: string }) => (isAr ? obj.ar : obj.en);
  const currentHostId = useAuthStore((s) => s.host?.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['property', id],
    queryFn: () => hostService.getProperty(id!),
    enabled: !!id,
    retry: false,
  });

  // Property detail (`/properties/:id`) does NOT embed units — fetch them
  // separately. Empty list while loading or on error is fine for display.
  const { data: unitsData } = useQuery({
    queryKey: ['property-units', id],
    queryFn: () => hostService.getUnitsForProperty(id!),
    enabled: !!id,
    retry: false,
  });

  const property: Property | undefined = (data as any)?.data;
  const units: Unit[] = ((unitsData as any)?.data ?? []) as Unit[];

  // Form state — initialised from property once it loads.
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [districtOther, setDistrictOther] = useState(false);
  const [rules, setRules] = useState<PropertyRules>(DEFAULT_RULES);
  // Typed text of the two night fields (kept as text so they can be cleared
  // while editing and accept Arabic-Indic digits).
  const [minNightsText, setMinNightsText] = useState('1');
  const [maxNightsText, setMaxNightsText] = useState('30');

  // Picker visibility
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showDirectionPicker, setShowDirectionPicker] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const districtOptions = useMemo(() => districtOptionsFor(city), [city]);

  // Hydrate form once when property arrives.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!property || hydrated) return;
    // `title` holds the English name, or a copy of the Arabic one when the
    // host gave no English name — show it only where it belongs.
    const storedTitle = (property.title || property.name || '').trim();
    const storedTitleAr = (property.titleAr || property.nameAr || '').trim();
    const titleIsArabic = /[\u0600-\u06FF]/.test(storedTitle);
    setTitleAr(storedTitleAr || (titleIsArabic ? storedTitle : ''));
    setTitleEn(titleIsArabic || storedTitle === storedTitleAr ? '' : storedTitle);
    setType(property.type || '');
    setDirection(property.direction || property.address?.direction || '');
    // Older listings may store another spelling of the city (e.g. "Medina").
    const rawCity = property.location?.city || property.address?.city || '';
    const loadedCity = normalizeCity(rawCity) || rawCity;
    const loadedDistrict = property.location?.district || '';
    setCity(loadedCity);
    setDistrict(loadedDistrict);
    setDistrictOther(
      !!loadedDistrict &&
        districtOptionsFor(loadedCity).length > 0 &&
        !isListedDistrict(loadedCity, loadedDistrict),
    );
    const loadedRules = { ...DEFAULT_RULES, ...(property.rules ?? {}) };
    setRules(loadedRules);
    setMinNightsText(String(loadedRules.minNights ?? 1));
    setMaxNightsText(String(loadedRules.maxNights ?? 30));
    setHydrated(true);
  }, [property, hydrated]);

  // Ownership guard — backend route is the public /properties/:id, so the
  // client must reject properties owned by someone else.
  const ownershipOk =
    !property || !property.host || !currentHostId || property.host._id === currentHostId;

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.updateProperty(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      Alert.alert(
        l({ en: 'Saved', ar: 'تم الحفظ' }),
        l({ en: 'Property updated successfully', ar: 'تم تحديث العقار بنجاح' }),
        [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        apiErrorMessage(error, 'تعذّر حفظ تعديلات العقار. حاول مرة أخرى.'),
      );
    },
  });

  // The Arabic name is the required one; English is optional.
  const canSubmit = titleAr.trim().length > 0 && type.length > 0 && city.length > 0;

  const handleSubmit = () => {
    if (mutation.isPending) return;
    if (!titleAr.trim()) {
      Alert.alert('اسم العقار مطلوب', 'اكتب اسم العقار بالعربية.');
      return;
    }
    if (!type || !city) {
      Alert.alert('بيانات ناقصة', 'اختر نوع العقار والمدينة.');
      return;
    }
    const minN = parseWhole(minNightsText, 0);
    const maxN = parseWhole(maxNightsText, 0);
    if (minN < 1 || minN > 365 || maxN < 1 || maxN > 365) {
      Alert.alert('مدة إقامة غير صالحة', 'أدخل عدد ليالٍ بين 1 و 365 للحد الأدنى والحد الأقصى.');
      return;
    }
    if (maxN < minN) {
      Alert.alert(
        l({ en: 'Invalid stay length', ar: 'مدة إقامة غير صالحة' }),
        l({
          en: 'Maximum nights must be greater than or equal to minimum nights.',
          ar: 'يجب أن يكون الحد الأقصى لليالي أكبر من أو يساوي الحد الأدنى.',
        }),
      );
      return;
    }
    const payload: Record<string, unknown> = {
      // The API requires `title`: the Arabic name stands in when no English name is given.
      title: titleEn.trim() || titleAr.trim(),
      titleAr: titleAr.trim(),
      type,
      direction: direction || undefined,
      // The server merges `location`, so address and coordinates are kept.
      location: {
        city,
        district: district.trim(),
      },
      rules: {
        checkInTime: rules.checkInTime,
        checkOutTime: rules.checkOutTime,
        minNights: minN,
        maxNights: maxN,
        smokingAllowed: rules.smokingAllowed,
        petsAllowed: rules.petsAllowed,
        partiesAllowed: rules.partiesAllowed,
      },
    };
    mutation.mutate(payload);
  };

  const handleEditUnit = (unit: Unit) => {
    const unitId = (unit as any)._id || unit.id;
    if (!unitId) return;
    router.push({ pathname: '/property/edit-unit/[id]', params: { id: unitId } });
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: { value: string; en: string; ar: string }[],
    selected: string,
    onSelect: (v: string) => void,
  ) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, selected === item.value && styles.pickerItemActive]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selected === item.value && styles.pickerItemTextActive,
                  ]}
                >
                  {l(item)}
                </Text>
                {selected === item.value && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // -------------------------------------------------------------------------
  // Loading / error / forbidden states
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

  if (isError || !property) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>
          {l({ en: 'Failed to load property', ar: 'فشل تحميل بيانات العقار' })}
        </Text>
        <Pressable style={styles.smallButton} onPress={() => router.back()}>
          <Text style={styles.smallButtonText}>{l({ en: 'Back', ar: 'رجوع' })}</Text>
        </Pressable>
      </View>
    );
  }

  if (!ownershipOk) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>
          {l({
            en: 'You do not have permission to edit this property',
            ar: 'ليس لديك صلاحية لتعديل هذا العقار',
          })}
        </Text>
        <Pressable style={styles.smallButton} onPress={() => router.back()}>
          <Text style={styles.smallButtonText}>{l({ en: 'Back', ar: 'رجوع' })}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {l({ en: 'Edit Property', ar: 'تعديل العقار' })}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Section: Metadata ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          {l({ en: 'Property details', ar: 'تفاصيل العقار' })}
        </Text>

        <Text style={styles.label}>{l({ en: 'Property name (Arabic)', ar: 'اسم العقار (بالعربية)' })} *</Text>
        <TextInput
          style={[styles.input, { textAlign: 'right' }]}
          placeholder={l({ en: 'e.g. Sunset Villa', ar: 'مثال: فيلا الغروب' })}
          placeholderTextColor={Colors.textTertiary}
          value={titleAr}
          maxLength={200}
          onChangeText={setTitleAr}
        />

        <Text style={styles.label}>
          {l({ en: 'Name in English (optional)', ar: 'الاسم بالإنجليزية (اختياري)' })}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Sunset Villa"
          placeholderTextColor={Colors.textTertiary}
          value={titleEn}
          maxLength={200}
          onChangeText={setTitleEn}
        />

        <Text style={styles.label}>{l({ en: 'Property Type', ar: 'نوع العقار' })} *</Text>
        <View style={styles.typeGrid}>
          {PROPERTY_TYPES.map((pt) => (
            <Pressable
              key={pt.value}
              style={[styles.typeCard, type === pt.value && styles.typeCardActive]}
              onPress={() => setType(pt.value)}
            >
              <Ionicons
                name={pt.icon as any}
                size={24}
                color={type === pt.value ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.typeLabel, type === pt.value && styles.typeLabelActive]}>
                {l(pt)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{l({ en: 'Direction', ar: 'الاتجاه' })}</Text>
        <Pressable style={styles.picker} onPress={() => setShowDirectionPicker(true)}>
          <Text style={direction ? styles.pickerValue : styles.pickerPlaceholder}>
            {direction
              ? (() => {
                  const d = DIRECTIONS.find((x) => x.value === direction);
                  return d ? l(d) : direction;
                })()
              : l({ en: 'Select direction', ar: 'اختر الاتجاه' })}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        <Text style={styles.label}>{l({ en: 'City', ar: 'المدينة' })} *</Text>
        <Pressable style={styles.picker} onPress={() => setShowCityPicker(true)}>
          <Text style={city ? styles.pickerValue : styles.pickerPlaceholder}>
            {city
              ? (() => {
                  const c = CITIES.find((x) => x.value === city);
                  return c ? l(c) : city;
                })()
              : l({ en: 'Select city', ar: 'اختر المدينة' })}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        {!!city && (
          <>
            <Text style={styles.label}>{l({ en: 'District', ar: 'الحي' })}</Text>
            {districtOptions.length > 0 && (
              <Pressable style={styles.picker} onPress={() => setShowDistrictPicker(true)}>
                <Text style={district || districtOther ? styles.pickerValue : styles.pickerPlaceholder}>
                  {districtOther
                    ? l({ en: 'Other district', ar: 'حي آخر' })
                    : district
                      ? districtLabel(city, district, isAr ? 'ar' : 'en')
                      : l({ en: 'Select district', ar: 'اختر الحي' })}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
            {(districtOptions.length === 0 || districtOther) && (
              <TextInput
                style={[
                  styles.input,
                  { textAlign: 'right' },
                  districtOptions.length > 0 && { marginTop: Spacing.sm },
                ]}
                placeholder={l({ en: 'Enter district name', ar: 'اكتب اسم الحي' })}
                placeholderTextColor={Colors.textTertiary}
                value={district}
                maxLength={80}
                onChangeText={setDistrict}
              />
            )}
          </>
        )}

        {/* ── Section: Stay rules ─────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Stay rules', ar: 'قواعد الإقامة' })}
        </Text>
        <Text style={styles.sectionHint}>
          {l({
            en: 'These apply to every unit on this property.',
            ar: 'تنطبق هذه القواعد على جميع وحدات هذا العقار.',
          })}
        </Text>

        <Text style={styles.label}>{l({ en: 'Check-in time', ar: 'وقت الوصول' })}</Text>
        <Pressable style={styles.picker} onPress={() => setShowCheckInPicker(true)}>
          <Text style={styles.pickerValue}>{rules.checkInTime}</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        <Text style={styles.label}>{l({ en: 'Check-out time', ar: 'وقت المغادرة' })}</Text>
        <Pressable style={styles.picker} onPress={() => setShowCheckOutPicker(true)}>
          <Text style={styles.pickerValue}>{rules.checkOutTime}</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{l({ en: 'Min nights', ar: 'الحد الأدنى لليالي' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={minNightsText}
              maxLength={3}
              onChangeText={(v) => setMinNightsText(cleanNumericInput(v, false))}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{l({ en: 'Max nights', ar: 'الحد الأقصى لليالي' })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxNightsText}
              maxLength={3}
              onChangeText={(v) => setMaxNightsText(cleanNumericInput(v, false))}
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{l({ en: 'Smoking allowed', ar: 'يسمح بالتدخين' })}</Text>
          <Switch
            value={rules.smokingAllowed}
            onValueChange={(v) => setRules((r) => ({ ...r, smokingAllowed: v }))}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{l({ en: 'Pets allowed', ar: 'يسمح بالحيوانات الأليفة' })}</Text>
          <Switch
            value={rules.petsAllowed}
            onValueChange={(v) => setRules((r) => ({ ...r, petsAllowed: v }))}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{l({ en: 'Parties allowed', ar: 'يسمح بالحفلات' })}</Text>
          <Switch
            value={rules.partiesAllowed}
            onValueChange={(v) => setRules((r) => ({ ...r, partiesAllowed: v }))}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>

        {/* ── Section: Units ──────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          {l({ en: 'Units', ar: 'الوحدات' })} ({units.length})
        </Text>
        <Text style={styles.sectionHint}>
          {l({
            en: 'Pricing, capacity, and amenities are configured per unit.',
            ar: 'يتم تحديد الأسعار والسعة والمرافق لكل وحدة على حدة.',
          })}
        </Text>

        {units.length === 0 ? (
          <View style={styles.unitEmpty}>
            <Text style={styles.subtleText}>
              {l({ en: 'No units yet.', ar: 'لا توجد وحدات بعد.' })}
            </Text>
          </View>
        ) : (
          units.map((unit) => (
            <View key={unit.id || (unit as any)._id} style={styles.unitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName} numberOfLines={1}>
                  {unit.nameAr || unit.name || unit.nameEn || 'وحدة بدون اسم'}
                </Text>
                {!!unit.code && <Text style={styles.unitMeta}>#{unit.code}</Text>}
              </View>
              <Pressable style={styles.unitEditButton} onPress={() => handleEditUnit(unit)}>
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
                <Text style={styles.unitEditText}>{l({ en: 'Edit', ar: 'تعديل' })}</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, (!canSubmit || mutation.isPending) && styles.submitButtonDisabled]}
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

      {/* Picker modals */}
      {renderPickerModal(
        showCityPicker,
        () => setShowCityPicker(false),
        l({ en: 'Select City', ar: 'اختر المدينة' }),
        CITIES,
        city,
        (v) => {
          if (v !== city) {
            setCity(v);
            setDistrict('');
            setDistrictOther(false);
          }
        },
      )}
      {renderPickerModal(
        showDistrictPicker,
        () => setShowDistrictPicker(false),
        l({ en: 'Select District', ar: 'اختر الحي' }),
        districtOptions,
        districtOther ? OTHER_DISTRICT : district,
        (v) => {
          if (v === OTHER_DISTRICT) {
            setDistrictOther(true);
            setDistrict('');
          } else {
            setDistrictOther(false);
            setDistrict(v);
          }
        },
      )}
      {renderPickerModal(
        showDirectionPicker,
        () => setShowDirectionPicker(false),
        l({ en: 'Select Direction', ar: 'اختر الاتجاه' }),
        DIRECTIONS,
        direction,
        setDirection,
      )}
      {renderPickerModal(
        showCheckInPicker,
        () => setShowCheckInPicker(false),
        l({ en: 'Check-in time', ar: 'وقت الوصول' }),
        timeOptions,
        rules.checkInTime,
        (v) => setRules((r) => ({ ...r, checkInTime: v })),
      )}
      {renderPickerModal(
        showCheckOutPicker,
        () => setShowCheckOutPicker(false),
        l({ en: 'Check-out time', ar: 'وقت المغادرة' }),
        timeOptions,
        rules.checkOutTime,
        (v) => setRules((r) => ({ ...r, checkOutTime: v })),
      )}
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleLabel: { ...Typography.body, color: Colors.textPrimary },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  typeCard: {
    width: '30%',
    aspectRatio: 1.2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    gap: Spacing.xs,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0D',
  },
  typeLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  typeLabelActive: { color: Colors.primary, fontWeight: '600' },

  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  pickerValue: { ...Typography.body, color: Colors.textPrimary },
  pickerPlaceholder: { ...Typography.body, color: Colors.textTertiary },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '60%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  pickerItemActive: { backgroundColor: Colors.primary + '0A' },
  pickerItemText: { ...Typography.body, color: Colors.textPrimary },
  pickerItemTextActive: { color: Colors.primary, fontWeight: '600' },

  unitEmpty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderStyle: 'dashed',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  unitName: { ...Typography.bodyBold, color: Colors.textPrimary },
  unitMeta: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  unitEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  unitEditText: { ...Typography.smallBold, color: Colors.primary },

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
