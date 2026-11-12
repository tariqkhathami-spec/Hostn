import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../services/host.service';
import { getLocale } from '../../utils/i18n';
import {
  CITIES,
  PROPERTY_TYPES,
  DIRECTIONS,
  OTHER_DISTRICT,
  districtOptionsFor,
  districtLabel,
} from '../../constants/listings';
import { apiErrorMessage } from '../../utils/apiError';
import { Colors, Spacing, Typography, Radius, Shadows, DirectionalIcon } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Simple property creation form — property is now a container (name, type,
// location only). Units hold the bookable details and are added separately.
// ---------------------------------------------------------------------------

export default function CreatePropertyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = getLocale();
  const isAr = locale === 'ar';
  const l = (obj: { en: string; ar: string }) => (isAr ? obj.ar : obj.en);

  // Form state
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  // True while the host types a district that is not in the city's list.
  const [districtOther, setDistrictOther] = useState(false);

  // Modals for pickers
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showDirectionPicker, setShowDirectionPicker] = useState(false);

  const districtOptions = districtOptionsFor(city);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => hostService.createProperty(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      const propertyId = res?.data?._id || res?.data?.id || res?._id || res?.id;
      if (!propertyId) {
        Alert.alert(
          l({ en: 'Warning', ar: 'تنبيه' }),
          l({
            en: 'Property created but could not retrieve its ID. Please check your properties list.',
            ar: 'تم إنشاء العقار لكن لم يتم استرجاع المعرف. يرجى التحقق من قائمة العقارات.',
          }),
          [{ text: l({ en: 'OK', ar: 'موافق' }), onPress: () => router.back() }],
        );
        return;
      }
      Alert.alert(
        l({ en: 'Success', ar: 'تم بنجاح' }),
        l({
          en: 'Property created! Now add your first unit.',
          ar: 'تم إنشاء العقار! أضف وحدتك الأولى الآن.',
        }),
        [
          {
            text: l({ en: 'Add Unit', ar: 'إضافة وحدة' }),
            onPress: () => {
              if (propertyId) {
                router.replace({
                  pathname: '/property/add-unit',
                  params: { propertyId: String(propertyId) },
                });
              } else {
                router.back();
              }
            },
          },
          {
            text: l({ en: 'Later', ar: 'لاحقًا' }),
            style: 'cancel',
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        apiErrorMessage(error, 'تعذّر إنشاء العقار. حاول مرة أخرى.'),
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
    if (!type) {
      Alert.alert('نوع العقار مطلوب', 'اختر نوع العقار من القائمة.');
      return;
    }
    if (!city) {
      Alert.alert('المدينة مطلوبة', 'اختر المدينة التي يقع فيها العقار.');
      return;
    }
    const payload: Record<string, unknown> = {
      // The API requires `title`: the Arabic name stands in when no English name is given.
      title: titleEn.trim() || titleAr.trim(),
      titleAr: titleAr.trim(),
      type,
      direction: direction || undefined,
      location: {
        city,
        district: district.trim() || undefined,
      },
    };
    mutation.mutate(payload);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: { value: string; en: string; ar: string }[],
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
            data={data}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.pickerItem,
                  selected === item.value && styles.pickerItemActive,
                ]}
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={DirectionalIcon.arrowBack} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {l({ en: 'New Property', ar: 'عقار جديد' })}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Name AR (required) */}
        <Text style={styles.label}>{l({ en: 'Property name (Arabic)', ar: 'اسم العقار (بالعربية)' })} *</Text>
        <TextInput
          style={[styles.input, { textAlign: 'right' }]}
          placeholder={l({ en: 'e.g. Sunset Villa', ar: 'مثال: فيلا الغروب' })}
          placeholderTextColor={Colors.textTertiary}
          value={titleAr}
          maxLength={200}
          onChangeText={setTitleAr}
        />

        {/* Name EN (optional) */}
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

        {/* Property Type */}
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
              <Text
                style={[
                  styles.typeLabel,
                  type === pt.value && styles.typeLabelActive,
                ]}
              >
                {l(pt)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Direction */}
        <Text style={styles.label}>{l({ en: 'Direction', ar: 'الاتجاه' })}</Text>
        <Pressable style={styles.picker} onPress={() => setShowDirectionPicker(true)}>
          <Text style={direction ? styles.pickerValue : styles.pickerPlaceholder}>
            {direction
              ? l(DIRECTIONS.find((d) => d.value === direction) ?? { en: direction, ar: direction })
              : l({ en: 'Select direction', ar: 'اختر الاتجاه' })}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        {/* City */}
        <Text style={styles.label}>{l({ en: 'City', ar: 'المدينة' })} *</Text>
        <Pressable style={styles.picker} onPress={() => setShowCityPicker(true)}>
          <Text style={city ? styles.pickerValue : styles.pickerPlaceholder}>
            {city
              ? l(CITIES.find((c) => c.value === city) ?? { en: city, ar: city })
              : l({ en: 'Select city', ar: 'اختر المدينة' })}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        {/* District: a list (with "other") when the city has one, free text otherwise */}
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
              {l({ en: 'Create Property', ar: 'إنشاء العقار' })}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Picker Modals */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.xl, paddingBottom: 120 },

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

  // Type grid
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

  // Picker button
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

  // Modal
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

  // Footer
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
