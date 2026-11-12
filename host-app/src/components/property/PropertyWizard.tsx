import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { getLocale } from '../../utils/i18n';
import {
  CITIES,
  PROPERTY_TYPES,
  UNIT_AMENITIES,
  UNIT_FEATURES,
  TIME_OPTIONS,
  OTHER_DISTRICT,
  districtOptionsFor,
  isListedDistrict,
  districtLabel,
} from '../../constants/listings';
import { cleanNumericInput, parseNumber } from '../../utils/format';
import { pickAndUploadImages, uploadFailureText } from '../../utils/uploadImages';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export interface PropertyFormData {
  /** Arabic name (the unit's `nameAr` in unit mode). */
  title: string;
  /** Optional English name. */
  nameEn: string;
  description: string;
  type: string;
  city: string;
  district: string;
  price: string;
  cleaningFee: string;
  discountPercent: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  checkInTime: string;
  checkOutTime: string;
  minNights: string;
  maxNights: string;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  /** Values of UNIT_AMENITIES (Unit.amenities enum). */
  amenities: string[];
  /** Values of UNIT_FEATURES (Unit.features enum). */
  features: string[];
  /** Free-text booking terms shown to guests (Unit.writtenRules). */
  writtenRules: string;
  images: { url: string; isPrimary: boolean }[];
}

export const defaultForm: PropertyFormData = {
  title: '',
  nameEn: '',
  description: '',
  type: '',
  city: '',
  district: '',
  price: '',
  cleaningFee: '0',
  discountPercent: '0',
  bedrooms: '1',
  bathrooms: '1',
  maxGuests: '2',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  minNights: '1',
  maxNights: '30',
  smokingAllowed: false,
  petsAllowed: false,
  partiesAllowed: false,
  amenities: [],
  features: [],
  writtenRules: '',
  images: [],
};

export interface PropertyWizardProps {
  initialData?: PropertyFormData;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  submitLabel: { en: string; ar: string };
  isSubmitting: boolean;
  /**
   * 'unit' adds a unit to an existing property: the type and location steps
   * are skipped (they belong to the property) and the form collects exactly
   * what the Unit model stores.
   */
  mode?: 'property' | 'unit';
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
const PROPERTY_STEPS = [1, 2, 3, 4, 5, 6, 7, 8];
const UNIT_STEPS = [3, 4, 5, 6, 7, 8];
const MAX_DISCOUNT_PERCENT = 90;

const STEP_TITLES: Record<number, { en: string; ar: string }> = {
  1: { en: 'Property Type', ar: 'نوع العقار' },
  2: { en: 'Location', ar: 'الموقع' },
  3: { en: 'Details', ar: 'التفاصيل' },
  4: { en: 'Pricing', ar: 'التسعير' },
  5: { en: 'Amenities', ar: 'المرافق والمزايا' },
  6: { en: 'Images', ar: 'الصور' },
  7: { en: 'Rules', ar: 'القواعد' },
  8: { en: 'Review', ar: 'المراجعة' },
};

export default function PropertyWizard({
  initialData,
  onSubmit,
  submitLabel,
  isSubmitting,
  mode = 'property',
}: PropertyWizardProps) {
  const router = useRouter();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  const isUnit = mode === 'unit';
  const stepIds = isUnit ? UNIT_STEPS : PROPERTY_STEPS;
  const TOTAL_STEPS = stepIds.length;
  // `pos` is the position in the flow; `step` is the id of the step shown.
  const [pos, setPos] = useState(0);
  const step = stepIds[pos];
  const [form, setForm] = useState<PropertyFormData>(initialData ?? { ...defaultForm });
  // True while the host is typing a district that is not in the city's list.
  const [districtOther, setDistrictOther] = useState(
    () =>
      !!initialData?.district &&
      districtOptionsFor(initialData.city).length > 0 &&
      !isListedDistrict(initialData.city, initialData.district),
  );

  // Modal states
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [districtPickerVisible, setDistrictPickerVisible] = useState(false);
  const [checkInPickerVisible, setCheckInPickerVisible] = useState(false);
  const [checkOutPickerVisible, setCheckOutPickerVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const updateForm = (key: keyof PropertyFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const numericStepper = (
    key: 'bedrooms' | 'bathrooms' | 'maxGuests' | 'minNights' | 'maxNights',
    min: number,
    max: number,
  ) => {
    const parsed = parseInt(form[key], 10);
    const val = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
    return (
      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => updateForm(key, String(Math.max(min, val - 1)))}
        >
          <Ionicons name="remove" size={20} color={Colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{val}</Text>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => updateForm(key, String(Math.min(max, val + 1)))}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </Pressable>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------
  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return !!form.type;
      case 2:
        return !!form.city;
      case 3:
        return !!form.title.trim();
      case 4: {
        const discount = parseNumber(form.discountPercent || '0');
        return parseNumber(form.price) > 0 && !(discount > MAX_DISCOUNT_PERCENT);
      }
      case 6:
        // Photos can be added later; the unit simply stays hidden from
        // guests until it has one (handleNext asks the host to confirm).
        return true;
      case 7:
        return isUnit || (parseInt(form.minNights, 10) || 1) <= (parseInt(form.maxNights, 10) || 1);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) {
      const msgs: Record<number, { en: string; ar: string }> = {
        1: { en: 'Please select a property type', ar: 'يرجى اختيار نوع العقار' },
        2: { en: 'Please select a city', ar: 'يرجى اختيار المدينة' },
        3: isUnit
          ? { en: 'Please enter the unit name in Arabic', ar: 'يرجى إدخال اسم الوحدة بالعربية' }
          : { en: 'Please enter the name in Arabic', ar: 'يرجى إدخال الاسم بالعربية' },
        4:
          parseNumber(form.discountPercent || '0') > MAX_DISCOUNT_PERCENT
            ? { en: 'Discount cannot exceed 90%', ar: 'نسبة الخصم لا يمكن أن تتجاوز 90%' }
            : { en: 'Please enter a nightly price above zero', ar: 'يرجى إدخال سعر لليلة أكبر من صفر' },
        6: { en: 'Please add at least one image', ar: 'يرجى إضافة صورة واحدة على الأقل' },
        7: {
          en: 'Minimum nights cannot exceed maximum nights',
          ar: 'الحد الأدنى لليالي لا يمكن أن يكون أكبر من الحد الأقصى',
        },
      };
      const msg = msgs[step];
      if (msg) Alert.alert(l({ en: 'Required', ar: 'مطلوب' }), l(msg));
      return;
    }
    if (step === 6 && form.images.length === 0) {
      Alert.alert(
        l({ en: 'No photos yet', ar: 'لم تضف صوراً بعد' }),
        l({
          en: 'Guests will not see this unit until it has at least one photo. You can add photos later from the edit screen.',
          ar: 'لن تظهر الوحدة للضيوف حتى تضيف صورة واحدة على الأقل. تقدر تضيف الصور لاحقاً من شاشة التعديل.',
        }),
        [
          { text: l({ en: 'Add photos', ar: 'إضافة صور' }), style: 'cancel' },
          { text: l({ en: 'Continue without photos', ar: 'متابعة بدون صور' }), onPress: () => setPos(pos + 1) },
        ],
      );
      return;
    }
    if (pos < TOTAL_STEPS - 1) setPos(pos + 1);
  };

  const handleBack = () => {
    if (pos > 0) {
      setPos(pos - 1);
    } else {
      const hasData = form.title || form.type || form.city || form.images.length > 0;
      if (hasData) {
        Alert.alert(
          l({ en: 'Discard changes?', ar: 'تجاهل التغييرات؟' }),
          l({ en: 'You have unsaved data. Continue?', ar: 'لديك بيانات غير محفوظة. هل تريد المتابعة؟' }),
          [
            { text: l({ en: 'Cancel', ar: 'إلغاء' }), style: 'cancel' },
            { text: l({ en: 'Discard', ar: 'تجاهل' }), style: 'destructive', onPress: () => router.back() },
          ],
        );
      } else {
        router.back();
      }
    }
  };

  // -------------------------------------------------------------------
  // Image handling
  // -------------------------------------------------------------------
  const pickImage = async () => {
    if (uploadingImage) return;
    setUploadingImage(true);
    try {
      // Each photo is added as soon as it uploads. `isPrimary` is decided
      // inside the state updater, so it sees photos added earlier in the
      // same batch (reading `form.images` here would be a stale snapshot
      // and mark every photo of the batch as primary).
      const result = await pickAndUploadImages((url) => {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, { url, isPrimary: !prev.images.some((img) => img.isPrimary) }],
        }));
      });
      if (result.failed > 0) {
        Alert.alert(l({ en: 'Upload problem', ar: 'تعذّر رفع بعض الصور' }), uploadFailureText(result));
      }
    } catch {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        l({ en: 'Could not open the photo library', ar: 'تعذّر فتح مكتبة الصور. تحقق من صلاحية الوصول للصور.' }),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      const hasPrimary = updated.some((img) => img.isPrimary);
      return {
        ...prev,
        images: hasPrimary ? updated : updated.map((img, i) => ({ ...img, isPrimary: i === 0 })),
      };
    });
  };

  const setPrimaryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));
  };

  // -------------------------------------------------------------------
  // Step renderers
  // -------------------------------------------------------------------
  const renderStep1 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Select Property Type', ar: 'اختر نوع العقار' })}</Text>
      <View style={styles.typeGrid}>
        {PROPERTY_TYPES.map((pt) => {
          const selected = form.type === pt.value;
          return (
            <Pressable
              key={pt.value}
              style={[styles.typeCard, selected && styles.typeCardSelected]}
              onPress={() => updateForm('type', pt.value)}
            >
              <Ionicons
                name={pt.icon as any}
                size={32}
                color={selected ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                {l(pt)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => {
    const cityObj = CITIES.find((c) => c.value === form.city);
    const districts = districtOptionsFor(form.city);
    const hasList = districts.length > 0;

    return (
      <View>
        <Text style={styles.sectionTitle}>{l({ en: 'Location', ar: 'الموقع' })}</Text>

        {/* City picker */}
        <Text style={styles.formLabel}>{l({ en: 'City', ar: 'المدينة' })}</Text>
        <Pressable style={styles.pickerButton} onPress={() => setCityPickerVisible(true)}>
          <Text style={[styles.pickerText, !form.city && { color: Colors.textTertiary }]}>
            {cityObj ? l(cityObj) : l({ en: 'Select city', ar: 'اختر المدينة' })}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </Pressable>

        {/* District: a list when the city has one (with "other"), free text otherwise */}
        <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
          {l({ en: 'District', ar: 'الحي' })}
        </Text>
        {hasList && (
          <Pressable style={styles.pickerButton} onPress={() => setDistrictPickerVisible(true)}>
            <Text
              style={[
                styles.pickerText,
                !form.district && !districtOther && { color: Colors.textTertiary },
              ]}
            >
              {districtOther
                ? l({ en: 'Other district', ar: 'حي آخر' })
                : form.district
                  ? districtLabel(form.city, form.district, locale === 'ar' ? 'ar' : 'en')
                  : l({ en: 'Select district', ar: 'اختر الحي' })}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
          </Pressable>
        )}
        {(!hasList || districtOther) && (
          <TextInput
            style={[styles.input, hasList && { marginTop: Spacing.sm }]}
            value={form.district}
            onChangeText={(v) => updateForm('district', v)}
            placeholder={l({ en: 'Enter district name', ar: 'اكتب اسم الحي' })}
            placeholderTextColor={Colors.textTertiary}
            textAlign="right"
            maxLength={80}
          />
        )}
      </View>
    );
  };

  const renderStep3 = () => (
    <View>
      <Text style={styles.sectionTitle}>
        {isUnit
          ? l({ en: 'Unit Details', ar: 'تفاصيل الوحدة' })
          : l({ en: 'Property Details', ar: 'تفاصيل العقار' })}
      </Text>

      <Text style={styles.formLabel}>
        {isUnit
          ? l({ en: 'Unit name (Arabic) *', ar: 'اسم الوحدة (بالعربية) *' })
          : l({ en: 'Name (Arabic) *', ar: 'الاسم (بالعربية) *' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(v) => updateForm('title', v)}
        placeholder={
          isUnit
            ? l({ en: 'e.g. Chalet 1', ar: 'مثال: شاليه رقم 1' })
            : l({ en: 'Property name', ar: 'اسم العقار' })
        }
        placeholderTextColor={Colors.textTertiary}
        textAlign="right"
        maxLength={200}
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Name in English (optional)', ar: 'الاسم بالإنجليزية (اختياري)' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.nameEn}
        onChangeText={(v) => updateForm('nameEn', v)}
        placeholder="Chalet 1"
        placeholderTextColor={Colors.textTertiary}
        textAlign="right"
        maxLength={200}
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Description', ar: 'الوصف' })}
      </Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        value={form.description}
        onChangeText={(v) => updateForm('description', v)}
        placeholder={
          isUnit
            ? l({ en: 'Describe the unit', ar: 'اكتب وصفاً للوحدة' })
            : l({ en: 'Describe your property', ar: 'وصف العقار' })
        }
        maxLength={5000}
        placeholderTextColor={Colors.textTertiary}
        multiline
        textAlign="right"
      />

      <View style={styles.stepperGroup}>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Bedrooms', ar: 'غرف النوم' })}</Text>
          {numericStepper('bedrooms', 0, 20)}
        </View>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Bathrooms', ar: 'دورات المياه' })}</Text>
          {numericStepper('bathrooms', 0, 20)}
        </View>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Max Guests', ar: 'الحد الأقصى للضيوف' })}</Text>
          {numericStepper('maxGuests', 1, 100)}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Pricing', ar: 'التسعير' })}</Text>

      <Text style={styles.formLabel}>{l({ en: 'Price per night (SAR)', ar: 'السعر لليلة (ريال)' })}</Text>
      <TextInput
        style={styles.input}
        value={form.price}
        onChangeText={(v) => updateForm('price', cleanNumericInput(v))}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />
      <Text style={styles.fieldHint}>
        {l({
          en: 'Applied to all seven days. You can set a different price per day later from the pricing screen.',
          ar: 'يُطبَّق هذا السعر على جميع أيام الأسبوع، ويمكنك لاحقاً تحديد سعر مختلف لكل يوم من شاشة التسعير.',
        })}
      </Text>

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Cleaning Fee (SAR)', ar: 'رسوم التنظيف (ريال)' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.cleaningFee}
        onChangeText={(v) => updateForm('cleaningFee', cleanNumericInput(v))}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Discount % (0–90)', ar: 'نسبة الخصم % (من 0 إلى 90)' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.discountPercent}
        onChangeText={(v) => {
          const cleaned = cleanNumericInput(v);
          updateForm(
            'discountPercent',
            parseNumber(cleaned) > MAX_DISCOUNT_PERCENT ? String(MAX_DISCOUNT_PERCENT) : cleaned,
          );
        }}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />
    </View>
  );

  const renderChipGrid = (
    options: { value: string; en: string; ar: string; icon: string }[],
    key: 'amenities' | 'features',
  ) => (
    <View style={styles.amenitiesGrid}>
      {options.map((am) => {
        const selected = form[key].includes(am.value);
        return (
          <Pressable
            key={am.value}
            style={[styles.amenityChip, selected && styles.amenityChipSelected]}
            onPress={() =>
              setForm((prev) => ({
                ...prev,
                [key]: prev[key].includes(am.value)
                  ? prev[key].filter((a) => a !== am.value)
                  : [...prev[key], am.value],
              }))
            }
          >
            <Ionicons
              name={am.icon as any}
              size={16}
              color={selected ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.amenityText, selected && styles.amenityTextSelected]}>
              {l(am)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Amenities', ar: 'المرافق' })}</Text>
      {renderChipGrid(UNIT_AMENITIES, 'amenities')}

      <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
        {l({ en: 'Features', ar: 'المزايا' })}
      </Text>
      {renderChipGrid(UNIT_FEATURES, 'features')}
    </View>
  );

  const renderStep6 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Images', ar: 'الصور' })}</Text>

      <Pressable style={styles.addImageBtn} onPress={pickImage} disabled={uploadingImage}>
        {uploadingImage ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color={Colors.primary} />
            <Text style={styles.addImageText}>
              {l({ en: 'Add Images', ar: 'إضافة صور' })}
            </Text>
          </>
        )}
      </Pressable>

      {form.images.length > 0 && (
        <FlatList
          horizontal
          data={form.images}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.md }}
          renderItem={({ item, index }) => (
            <View style={styles.imageCard}>
              <Image source={{ uri: item.url }} style={styles.imageThumb} />
              {item.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>
                    {l({ en: 'Primary', ar: 'رئيسية' })}
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.removeImageBtn}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              </Pressable>
              {!item.isPrimary && (
                <Pressable
                  style={styles.setPrimaryBtn}
                  onPress={() => setPrimaryImage(index)}
                >
                  <Text style={styles.setPrimaryText}>
                    {l({ en: 'Set Primary', ar: 'تعيين كرئيسية' })}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <Text style={styles.imageCount}>
        {l({ en: 'Photos added', ar: 'عدد الصور المضافة' })}: {form.images.length}
      </Text>
    </View>
  );

  const renderUnitRulesStep = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Booking terms', ar: 'شروط الحجز' })}</Text>
      <Text style={styles.formLabel}>
        {l({ en: 'Written terms (optional)', ar: 'شروط مكتوبة تظهر للضيف (اختياري)' })}
      </Text>
      <TextInput
        style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
        value={form.writtenRules}
        onChangeText={(v) => updateForm('writtenRules', v)}
        placeholder={l({
          en: 'e.g. Families only, no loud music after midnight',
          ar: 'مثال: للعائلات فقط، يمنع تشغيل الموسيقى بعد منتصف الليل',
        })}
        placeholderTextColor={Colors.textTertiary}
        multiline
        textAlign="right"
        maxLength={5000}
      />
      <Text style={styles.fieldHint}>
        {l({
          en: 'Check-in and check-out times and the minimum stay are set on the property and apply to all its units.',
          ar: 'أوقات الدخول والخروج والحد الأدنى لليالي تُحدَّد من إعدادات العقار وتنطبق على جميع وحداته.',
        })}
      </Text>
    </View>
  );

  const renderStep7 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Rules', ar: 'القواعد' })}</Text>

      {/* Check-in time */}
      <Text style={styles.formLabel}>{l({ en: 'Check-in Time', ar: 'وقت الدخول' })}</Text>
      <Pressable style={styles.pickerButton} onPress={() => setCheckInPickerVisible(true)}>
        <Text style={styles.pickerText}>{form.checkInTime}</Text>
        <Ionicons name="time-outline" size={20} color={Colors.textTertiary} />
      </Pressable>

      {/* Check-out time */}
      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Check-out Time', ar: 'وقت الخروج' })}
      </Text>
      <Pressable style={styles.pickerButton} onPress={() => setCheckOutPickerVisible(true)}>
        <Text style={styles.pickerText}>{form.checkOutTime}</Text>
        <Ionicons name="time-outline" size={20} color={Colors.textTertiary} />
      </Pressable>

      {/* Min / Max nights */}
      <View style={[styles.stepperGroup, { marginTop: Spacing.base }]}>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Min Nights', ar: 'أقل عدد ليالي' })}</Text>
          {numericStepper('minNights', 1, 30)}
        </View>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Max Nights', ar: 'أكثر عدد ليالي' })}</Text>
          {numericStepper('maxNights', 1, 365)}
        </View>
      </View>

      {/* Switches */}
      <View style={styles.switchRow}>
        <Switch
          value={form.smokingAllowed}
          onValueChange={(v) => updateForm('smokingAllowed', v)}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={form.smokingAllowed ? Colors.primary : Colors.textTertiary}
        />
        <Text style={styles.switchLabel}>{l({ en: 'Smoking Allowed', ar: 'التدخين مسموح' })}</Text>
      </View>
      <View style={styles.switchRow}>
        <Switch
          value={form.petsAllowed}
          onValueChange={(v) => updateForm('petsAllowed', v)}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={form.petsAllowed ? Colors.primary : Colors.textTertiary}
        />
        <Text style={styles.switchLabel}>{l({ en: 'Pets Allowed', ar: 'الحيوانات مسموحة' })}</Text>
      </View>
      <View style={styles.switchRow}>
        <Switch
          value={form.partiesAllowed}
          onValueChange={(v) => updateForm('partiesAllowed', v)}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={form.partiesAllowed ? Colors.primary : Colors.textTertiary}
        />
        <Text style={styles.switchLabel}>{l({ en: 'Parties Allowed', ar: 'الحفلات مسموحة' })}</Text>
      </View>
    </View>
  );

  const renderStep8 = () => {
    const typeObj = PROPERTY_TYPES.find((pt) => pt.value === form.type);
    const cityObj = CITIES.find((c) => c.value === form.city);
    const sar = l({ en: 'SAR', ar: 'ريال' });

    return (
      <View>
        <Text style={styles.sectionTitle}>{l({ en: 'Review', ar: 'المراجعة' })}</Text>

        <View style={styles.reviewCard}>
          {!isUnit && (
            <>
              <ReviewRow label={l({ en: 'Type', ar: 'النوع' })} value={typeObj ? l(typeObj) : '-'} />
              <ReviewRow label={l({ en: 'City', ar: 'المدينة' })} value={cityObj ? l(cityObj) : '-'} />
              <ReviewRow
                label={l({ en: 'District', ar: 'الحي' })}
                value={districtLabel(form.city, form.district, locale === 'ar' ? 'ar' : 'en') || '-'}
              />
            </>
          )}
          <ReviewRow
            label={isUnit ? l({ en: 'Unit name', ar: 'اسم الوحدة' }) : l({ en: 'Name', ar: 'الاسم' })}
            value={form.title.trim() || '-'}
          />
          {!!form.nameEn.trim() && (
            <ReviewRow label={l({ en: 'English name', ar: 'الاسم بالإنجليزية' })} value={form.nameEn.trim()} />
          )}
          <ReviewRow
            label={l({ en: 'Price/Night', ar: 'سعر الليلة' })}
            value={form.price ? `${form.price} ${sar}` : '-'}
          />
          <ReviewRow
            label={l({ en: 'Cleaning Fee', ar: 'رسوم التنظيف' })}
            value={`${form.cleaningFee || '0'} ${sar}`}
          />
          <ReviewRow label={l({ en: 'Discount', ar: 'الخصم' })} value={`${form.discountPercent || '0'}%`} />
          <ReviewRow label={l({ en: 'Bedrooms', ar: 'غرف النوم' })} value={form.bedrooms} />
          <ReviewRow label={l({ en: 'Bathrooms', ar: 'دورات المياه' })} value={form.bathrooms} />
          <ReviewRow label={l({ en: 'Max guests', ar: 'الحد الأقصى للضيوف' })} value={form.maxGuests} />
          <ReviewRow
            label={l({ en: 'Amenities & features', ar: 'المرافق والمزايا المختارة' })}
            value={String(form.amenities.length + form.features.length)}
          />
          <ReviewRow label={l({ en: 'Images', ar: 'عدد الصور' })} value={String(form.images.length)} />
          {!isUnit && (
            <>
              <ReviewRow label={l({ en: 'Check-in', ar: 'الدخول' })} value={form.checkInTime} />
              <ReviewRow label={l({ en: 'Check-out', ar: 'الخروج' })} value={form.checkOutTime} />
              <ReviewRow
                label={l({ en: 'Nights', ar: 'الليالي' })}
                value={`${form.minNights} - ${form.maxNights}`}
              />
            </>
          )}
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Modals
  // -------------------------------------------------------------------
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: { value: string; en: string; ar: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.pickerItem,
                  selectedValue === item.value && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedValue === item.value && styles.pickerItemTextSelected,
                  ]}
                >
                  {l(item)}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTimePickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.pickerItem,
                  selectedValue === item && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedValue === item && styles.pickerItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {selectedValue === item && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // -------------------------------------------------------------------
  // Render current step
  // -------------------------------------------------------------------
  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return isUnit ? renderUnitRulesStep() : renderStep7();
      case 8: return renderStep8();
      default: return null;
    }
  };

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerBackBtn}>
          <Ionicons name="chevron-forward" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isUnit && step === 7
            ? l({ en: 'Booking terms', ar: 'شروط الحجز' })
            : l(STEP_TITLES[step])}
        </Text>
        <Text style={styles.headerStep}>{pos + 1}/{TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((pos + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomBar}>
        {pos > 0 && (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>{l({ en: 'Back', ar: 'رجوع' })}</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextButton,
            pos === 0 && { flex: 1 },
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={pos === TOTAL_STEPS - 1 ? () => onSubmit(form) : handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {pos === TOTAL_STEPS - 1 ? l(submitLabel) : l({ en: 'Next', ar: 'التالي' })}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Modals */}
      {renderPickerModal(
        cityPickerVisible,
        () => setCityPickerVisible(false),
        l({ en: 'Select City', ar: 'اختر المدينة' }),
        CITIES,
        form.city,
        (v) => {
          // A district belongs to its city: changing the city clears it.
          if (v !== form.city) {
            setForm((prev) => ({ ...prev, city: v, district: '' }));
            setDistrictOther(false);
          }
        },
      )}
      {renderPickerModal(
        districtPickerVisible,
        () => setDistrictPickerVisible(false),
        l({ en: 'Select District', ar: 'اختر الحي' }),
        districtOptionsFor(form.city),
        districtOther ? OTHER_DISTRICT : form.district,
        (v) => {
          if (v === OTHER_DISTRICT) {
            setDistrictOther(true);
            updateForm('district', '');
          } else {
            setDistrictOther(false);
            updateForm('district', v);
          }
        },
      )}
      {renderTimePickerModal(
        checkInPickerVisible,
        () => setCheckInPickerVisible(false),
        l({ en: 'Check-in Time', ar: 'وقت الدخول' }),
        form.checkInTime,
        (v) => updateForm('checkInTime', v),
      )}
      {renderTimePickerModal(
        checkOutPickerVisible,
        () => setCheckOutPickerVisible(false),
        l({ en: 'Check-out Time', ar: 'وقت الخروج' }),
        form.checkOutTime,
        (v) => updateForm('checkOutTime', v),
      )}
    </View>
  );
}

// -------------------------------------------------------------------
// Review row sub-component
// -------------------------------------------------------------------
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewValue}>{value}</Text>
      <Text style={styles.reviewLabel}>{label}</Text>
    </View>
  );
}

// -------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.white,
    textAlign: 'center',
  },
  headerStep: {
    ...Typography.smallBold,
    color: Colors.primary200,
    minWidth: 36,
    textAlign: 'center',
  },

  // Progress
  progressBar: {
    height: 4,
    backgroundColor: Colors.primary100,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.gold,
  },

  // Content
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl + 80,
  },

  // Section
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.lg,
  },

  // Form elements
  formLabel: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
  },

  fieldHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },

  // Picker
  pickerButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  // Type grid (Step 1)
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  typeCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary50,
  },
  typeLabel: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: Colors.primary,
  },

  // Stepper
  stepperGroup: {
    gap: Spacing.base,
    marginTop: Spacing.lg,
  },
  stepperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },

  // Amenities (Step 5)
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amenityText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  amenityTextSelected: {
    color: Colors.white,
  },

  // Images (Step 6)
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
  },
  addImageText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  imageCard: {
    width: 140,
    height: 140,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.gold,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    ...Typography.tiny,
    color: Colors.white,
    fontWeight: '700',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  setPrimaryBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  setPrimaryText: {
    ...Typography.tiny,
    color: Colors.white,
  },
  imageCount: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Rules (Step 7)
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  switchLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },

  // Review (Step 8)
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reviewLabel: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  reviewValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'left',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.bottomBar,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary50,
  },
  pickerItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
