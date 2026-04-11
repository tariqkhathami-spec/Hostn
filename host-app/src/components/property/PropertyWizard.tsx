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
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { getLocale } from '../../utils/i18n';
import {
  CITIES,
  DISTRICTS,
  PROPERTY_TYPES,
  ALL_AMENITIES,
  TIME_OPTIONS,
} from '../../constants/listings';
import { hostService } from '../../services/host.service';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export interface PropertyFormData {
  title: string;
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
  amenities: string[];
  images: { url: string; isPrimary: boolean }[];
}

export const defaultForm: PropertyFormData = {
  title: '',
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
  images: [],
};

export interface PropertyWizardProps {
  initialData?: PropertyFormData;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  submitLabel: { en: string; ar: string };
  isSubmitting: boolean;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
const TOTAL_STEPS = 8;

const STEP_TITLES: { en: string; ar: string }[] = [
  { en: 'Property Type', ar: 'نوع العقار' },
  { en: 'Location', ar: 'الموقع' },
  { en: 'Details', ar: 'التفاصيل' },
  { en: 'Pricing', ar: 'التسعير' },
  { en: 'Amenities', ar: 'المرافق' },
  { en: 'Images', ar: 'الصور' },
  { en: 'Rules', ar: 'القواعد' },
  { en: 'Review', ar: 'المراجعة' },
];

export default function PropertyWizard({
  initialData,
  onSubmit,
  submitLabel,
  isSubmitting,
}: PropertyWizardProps) {
  const router = useRouter();
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PropertyFormData>(initialData ?? { ...defaultForm });

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
    const val = parseInt(form[key], 10) || min;
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
      case 4:
        return !!form.price && parseFloat(form.price) > 0;
      case 6:
        return form.images.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) {
      const msgs: Record<number, { en: string; ar: string }> = {
        1: { en: 'Please select a property type', ar: 'يرجى اختيار نوع العقار' },
        2: { en: 'Please select a city', ar: 'يرجى اختيار المدينة' },
        3: { en: 'Please enter a title', ar: 'يرجى إدخال العنوان' },
        4: { en: 'Please enter a valid price', ar: 'يرجى إدخال سعر صحيح' },
        6: { en: 'Please add at least one image', ar: 'يرجى إضافة صورة واحدة على الأقل' },
      };
      const msg = msgs[step];
      if (msg) Alert.alert(l({ en: 'Required', ar: 'مطلوب' }), l(msg));
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploadingImage(true);
    try {
      for (const asset of result.assets) {
        const formData = new FormData();
        const fileName = asset.uri.split('/').pop() || 'image.jpg';
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('image', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);

        const res = await hostService.uploadImage(formData);
        const url = res?.data?.url || res?.url || asset.uri;
        const isPrimary = form.images.length === 0;
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, { url, isPrimary }],
        }));
      }
    } catch {
      Alert.alert(
        l({ en: 'Error', ar: 'خطأ' }),
        l({ en: 'Failed to upload image', ar: 'فشل رفع الصورة' }),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, images: updated };
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
    const districts = form.city ? DISTRICTS[form.city] || [] : [];
    const districtObj = districts.find((d) => d.value === form.district);

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

        {/* District picker */}
        <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
          {l({ en: 'District', ar: 'الحي' })}
        </Text>
        {districts.length > 0 ? (
          <Pressable style={styles.pickerButton} onPress={() => setDistrictPickerVisible(true)}>
            <Text style={[styles.pickerText, !form.district && { color: Colors.textTertiary }]}>
              {districtObj ? l(districtObj) : l({ en: 'Select district', ar: 'اختر الحي' })}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
          </Pressable>
        ) : (
          <TextInput
            style={styles.input}
            value={form.district}
            onChangeText={(v) => updateForm('district', v)}
            placeholder={l({ en: 'Enter district name', ar: 'أدخل اسم الحي' })}
            placeholderTextColor={Colors.textTertiary}
            textAlign="right"
          />
        )}
      </View>
    );
  };

  const renderStep3 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Property Details', ar: 'تفاصيل العقار' })}</Text>

      <Text style={styles.formLabel}>{l({ en: 'Title', ar: 'العنوان' })}</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(v) => updateForm('title', v)}
        placeholder={l({ en: 'Property title', ar: 'عنوان العقار' })}
        placeholderTextColor={Colors.textTertiary}
        textAlign="right"
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Description', ar: 'الوصف' })}
      </Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        value={form.description}
        onChangeText={(v) => updateForm('description', v)}
        placeholder={l({ en: 'Describe your property', ar: 'وصف العقار' })}
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
          {numericStepper('bathrooms', 1, 20)}
        </View>
        <View style={styles.stepperItem}>
          <Text style={styles.stepperLabel}>{l({ en: 'Max Guests', ar: 'الحد الأقصى للضيوف' })}</Text>
          {numericStepper('maxGuests', 1, 50)}
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
        onChangeText={(v) => updateForm('price', v)}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Cleaning Fee (SAR)', ar: 'رسوم التنظيف (ريال)' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.cleaningFee}
        onChangeText={(v) => updateForm('cleaningFee', v)}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />

      <Text style={[styles.formLabel, { marginTop: Spacing.base }]}>
        {l({ en: 'Discount %', ar: 'نسبة الخصم %' })}
      </Text>
      <TextInput
        style={styles.input}
        value={form.discountPercent}
        onChangeText={(v) => updateForm('discountPercent', v)}
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        textAlign="right"
      />
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.sectionTitle}>{l({ en: 'Amenities', ar: 'المرافق' })}</Text>
      <View style={styles.amenitiesGrid}>
        {ALL_AMENITIES.map((am) => {
          const selected = form.amenities.includes(am.value);
          return (
            <Pressable
              key={am.value}
              style={[styles.amenityChip, selected && styles.amenityChipSelected]}
              onPress={() => {
                const list = selected
                  ? form.amenities.filter((a) => a !== am.value)
                  : [...form.amenities, am.value];
                updateForm('amenities', list);
              }}
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
        {form.images.length} {l({ en: 'images', ar: 'صور' })}
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

    return (
      <View>
        <Text style={styles.sectionTitle}>{l({ en: 'Review', ar: 'المراجعة' })}</Text>

        <View style={styles.reviewCard}>
          <ReviewRow
            label={l({ en: 'Type', ar: 'النوع' })}
            value={typeObj ? l(typeObj) : '-'}
          />
          <ReviewRow
            label={l({ en: 'City', ar: 'المدينة' })}
            value={cityObj ? l(cityObj) : '-'}
          />
          <ReviewRow
            label={l({ en: 'District', ar: 'الحي' })}
            value={form.district || '-'}
          />
          <ReviewRow label={l({ en: 'Title', ar: 'العنوان' })} value={form.title || '-'} />
          <ReviewRow
            label={l({ en: 'Price/Night', ar: 'السعر/ليلة' })}
            value={form.price ? `${form.price} ${l({ en: 'SAR', ar: 'ريال' })}` : '-'}
          />
          <ReviewRow
            label={l({ en: 'Cleaning Fee', ar: 'رسوم التنظيف' })}
            value={`${form.cleaningFee} ${l({ en: 'SAR', ar: 'ريال' })}`}
          />
          <ReviewRow label={l({ en: 'Discount', ar: 'الخصم' })} value={`${form.discountPercent}%`} />
          <ReviewRow
            label={l({ en: 'Capacity', ar: 'السعة' })}
            value={`${form.bedrooms} ${l({ en: 'bed', ar: 'غرف' })} / ${form.bathrooms} ${l({ en: 'bath', ar: 'حمام' })} / ${form.maxGuests} ${l({ en: 'guests', ar: 'ضيوف' })}`}
          />
          <ReviewRow
            label={l({ en: 'Amenities', ar: 'المرافق' })}
            value={`${form.amenities.length} ${l({ en: 'selected', ar: 'مختارة' })}`}
          />
          <ReviewRow
            label={l({ en: 'Images', ar: 'الصور' })}
            value={`${form.images.length} ${l({ en: 'images', ar: 'صور' })}`}
          />
          <ReviewRow
            label={l({ en: 'Check-in', ar: 'الدخول' })}
            value={form.checkInTime}
          />
          <ReviewRow
            label={l({ en: 'Check-out', ar: 'الخروج' })}
            value={form.checkOutTime}
          />
          <ReviewRow
            label={l({ en: 'Nights', ar: 'الليالي' })}
            value={`${form.minNights} - ${form.maxNights}`}
          />
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
      case 7: return renderStep7();
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
        <Text style={styles.headerTitle}>{l(STEP_TITLES[step - 1])}</Text>
        <Text style={styles.headerStep}>{step}/{TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
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
        {step > 1 && (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>{l({ en: 'Back', ar: 'رجوع' })}</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextButton,
            step === 1 && { flex: 1 },
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={step === TOTAL_STEPS ? () => onSubmit(form) : handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === TOTAL_STEPS ? l(submitLabel) : l({ en: 'Next', ar: 'التالي' })}
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
        (v) => updateForm('city', v),
      )}
      {renderPickerModal(
        districtPickerVisible,
        () => setDistrictPickerVisible(false),
        l({ en: 'Select District', ar: 'اختر الحي' }),
        form.city ? DISTRICTS[form.city] || [] : [],
        form.district,
        (v) => updateForm('district', v),
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
    textAlign: 'right',
    marginBottom: Spacing.lg,
  },

  // Form elements
  formLabel: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'right',
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
