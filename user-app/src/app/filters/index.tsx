import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../store/searchStore';
import { PROPERTY_TYPES } from '../../constants/config';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useLanguage, type TranslationKey } from '../../i18n';

// `value` is what the search API receives; `labelKey` is what the guest reads.
const AMENITY_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Pool', labelKey: 'amenity.pool' },
  { value: 'WiFi', labelKey: 'amenity.wifi' },
  { value: 'Playground', labelKey: 'amenity.playground' },
  { value: 'BBQ', labelKey: 'amenity.bbq' },
  { value: 'Parking', labelKey: 'amenity.parking' },
  { value: 'Kitchen', labelKey: 'amenity.kitchen' },
  { value: 'Air Conditioning', labelKey: 'amenity.ac' },
  { value: 'Garden', labelKey: 'amenity.garden' },
  { value: 'Gym', labelKey: 'amenity.gym' },
  { value: 'Jacuzzi', labelKey: 'amenity.jacuzzi' },
  { value: 'Sauna', labelKey: 'amenity.sauna' },
];

const RATING_OPTIONS: { label: string | null; value: number | null }[] = [
  { label: null, value: null },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const DIRECTION_OPTIONS: { labelKey: TranslationKey; value: string | null }[] = [
  { labelKey: 'filter.any', value: null },
  { labelKey: 'filter.north', value: 'north' },
  { labelKey: 'filter.south', value: 'south' },
  { labelKey: 'filter.east', value: 'east' },
  { labelKey: 'filter.west', value: 'west' },
  { labelKey: 'filter.northeast', value: 'northeast' },
  { labelKey: 'filter.northwest', value: 'northwest' },
  { labelKey: 'filter.southeast', value: 'southeast' },
  { labelKey: 'filter.southwest', value: 'southwest' },
];

export default function FiltersScreen() {
  const router = useRouter();
  const store = useSearchStore();
  const { t } = useLanguage();

  const toggleAmenity = (a: string) => {
    const next = store.amenities.includes(a)
      ? store.amenities.filter((x) => x !== a)
      : [...store.amenities, a];
    store.setAmenities(next);
  };

  const handleApply = () => {
    router.back();
  };

  const handleReset = () => {
    store.resetFilters();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('filter.title')}</Text>
        <Pressable onPress={handleReset}>
          <Text style={styles.resetText}>{t('filter.reset')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Property Type */}
        <Text style={styles.sectionTitle}>{t('search.propertyType')}</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map((type) => (
            <Pressable
              key={type.id}
              style={[styles.chip, store.propertyType === type.id && styles.chipActive]}
              onPress={() => store.setPropertyType(store.propertyType === type.id ? null : type.id)}
            >
              <Text style={[styles.chipText, store.propertyType === type.id && styles.chipTextActive]}>
                {t(`type.${type.id}` as TranslationKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Price Range */}
        <Text style={styles.sectionTitle}>{t('filter.priceRange')}</Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>{t('filter.min')}</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={store.minPrice != null ? String(store.minPrice) : ''}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                store.setMinPrice(isNaN(n) ? null : Math.min(n, 4000));
              }}
            />
          </View>
          <Text style={styles.rangeDash}>-</Text>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>{t('filter.max')}</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="4000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={store.maxPrice != null ? String(store.maxPrice) : ''}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                store.setMaxPrice(isNaN(n) ? null : Math.min(n, 4000));
              }}
            />
          </View>
        </View>

        {/* Bedrooms */}
        <Text style={styles.sectionTitle}>{t('filter.bedrooms')}</Text>
        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => store.setBedrooms(Math.max(0, store.bedrooms - 1))}>
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.counterValue}>{store.bedrooms === 0 ? t('filter.any') : store.bedrooms}</Text>
          <Pressable style={styles.counterBtn} onPress={() => store.setBedrooms(Math.min(8, store.bedrooms + 1))}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Bathrooms */}
        <Text style={styles.sectionTitle}>{t('filter.bathrooms')}</Text>
        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => store.setBathrooms(Math.max(0, store.bathrooms - 1))}>
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.counterValue}>{store.bathrooms === 0 ? t('filter.any') : store.bathrooms}</Text>
          <Pressable style={styles.counterBtn} onPress={() => store.setBathrooms(Math.min(8, store.bathrooms + 1))}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Rating */}
        <Text style={styles.sectionTitle}>{t('filter.minRating')}</Text>
        <View style={styles.chipRow}>
          {RATING_OPTIONS.map((opt) => (
            <Pressable
              key={String(opt.value)}
              style={[styles.chip, store.ratingMin === opt.value && styles.chipActive]}
              onPress={() => store.setRatingMin(opt.value)}
            >
              <Text style={[styles.chipText, store.ratingMin === opt.value && styles.chipTextActive]}>
                {opt.label ?? t('filter.any')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Deals Only Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.sectionTitle}>{t('filter.dealsOnly')}</Text>
            <Text style={styles.toggleSubtext}>{t('filter.dealsOnlySub')}</Text>
          </View>
          <Switch
            value={store.hasDiscount}
            onValueChange={store.setHasDiscount}
            trackColor={{ false: Colors.border, true: Colors.primary300 }}
            thumbColor={store.hasDiscount ? Colors.primary : Colors.white}
          />
        </View>

        {/* District */}
        <Text style={styles.sectionTitle}>{t('filter.district')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('filter.enterDistrict')}
          placeholderTextColor={Colors.textTertiary}
          value={store.district ?? ''}
          onChangeText={(text) => store.setDistrict(text.length > 0 ? text : null)}
        />

        {/* Direction */}
        <Text style={styles.sectionTitle}>{t('filter.direction')}</Text>
        <View style={styles.chipRow}>
          {DIRECTION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.labelKey}
              style={[styles.chip, store.direction === opt.value && styles.chipActive]}
              onPress={() => store.setDirection(opt.value)}
            >
              <Text style={[styles.chipText, store.direction === opt.value && styles.chipTextActive]}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Area Range */}
        <Text style={styles.sectionTitle}>{t('filter.area')}</Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>{t('filter.min')}</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={store.minArea != null ? String(store.minArea) : ''}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                store.setMinArea(isNaN(n) ? null : n);
              }}
            />
          </View>
          <Text style={styles.rangeDash}>-</Text>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>{t('filter.max')}</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder={t('filter.noLimit')}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={store.maxArea != null ? String(store.maxArea) : ''}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                store.setMaxArea(isNaN(n) ? null : n);
              }}
            />
          </View>
        </View>

        {/* Amenities */}
        <Text style={styles.sectionTitle}>{t('filter.amenities')}</Text>
        <View style={styles.chipRow}>
          {AMENITY_OPTIONS.map((a) => (
            <Pressable
              key={a.value}
              style={[styles.chip, store.amenities.includes(a.value) && styles.chipActive]}
              onPress={() => toggleAmenity(a.value)}
            >
              <Text style={[styles.chipText, store.amenities.includes(a.value) && styles.chipTextActive]}>
                {t(a.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyText}>{t('filter.apply')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  resetText: { ...Typography.small, color: Colors.primary },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  sectionTitle: {
    ...Typography.bodyBold, color: Colors.textPrimary,
    marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.small, color: Colors.textPrimary },
  chipTextActive: { color: Colors.white },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl,
  },
  counterBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  counterValue: { ...Typography.h3, color: Colors.textPrimary, minWidth: 50, textAlign: 'center' },
  rangeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  rangeInputWrapper: { flex: 1 },
  rangeLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.xs },
  rangeInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  rangeDash: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.lg },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  toggleSubtext: { ...Typography.caption, color: Colors.textSecondary },
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  applyButton: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.base,
    borderRadius: Radius.md, alignItems: 'center',
  },
  applyText: { ...Typography.bodyBold, color: Colors.white },
});
