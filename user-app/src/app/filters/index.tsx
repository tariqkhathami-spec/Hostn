import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../store/searchStore';
import { PROPERTY_TYPES } from '../../constants/config';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

const AMENITY_OPTIONS = [
  'Pool', 'WiFi', 'Playground', 'BBQ', 'Parking', 'Kitchen',
  'Air Conditioning', 'Garden', 'Gym', 'Jacuzzi', 'Sauna',
];

export default function FiltersScreen() {
  const router = useRouter();
  const { propertyType, setPropertyType } = useSearchStore();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleApply = () => {
    router.back();
  };

  const handleReset = () => {
    setPropertyType(null);
    setSelectedAmenities([]);
    setBedrooms(0);
    setBathrooms(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Filters</Text>
        <Pressable onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Property Type */}
        <Text style={styles.sectionTitle}>Property Type</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map((type) => (
            <Pressable
              key={type.id}
              style={[styles.chip, propertyType === type.id && styles.chipActive]}
              onPress={() => setPropertyType(propertyType === type.id ? null : type.id)}
            >
              <Text style={[styles.chipText, propertyType === type.id && styles.chipTextActive]}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bedrooms */}
        <Text style={styles.sectionTitle}>Bedrooms</Text>
        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => setBedrooms(Math.max(0, bedrooms - 1))}>
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.counterValue}>{bedrooms === 0 ? 'Any' : bedrooms}</Text>
          <Pressable style={styles.counterBtn} onPress={() => setBedrooms(bedrooms + 1)}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Bathrooms */}
        <Text style={styles.sectionTitle}>Bathrooms</Text>
        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => setBathrooms(Math.max(0, bathrooms - 1))}>
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.counterValue}>{bathrooms === 0 ? 'Any' : bathrooms}</Text>
          <Pressable style={styles.counterBtn} onPress={() => setBathrooms(bathrooms + 1)}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Amenities */}
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.chipRow}>
          {AMENITY_OPTIONS.map((a) => (
            <Pressable
              key={a}
              style={[styles.chip, selectedAmenities.includes(a) && styles.chipActive]}
              onPress={() => toggleAmenity(a)}
            >
              <Text style={[styles.chipText, selectedAmenities.includes(a) && styles.chipTextActive]}>
                {a}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyText}>Apply Filters</Text>
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
  sectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
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
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  applyButton: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.base,
    borderRadius: Radius.md, alignItems: 'center',
  },
  applyText: { ...Typography.bodyBold, color: Colors.white },
});
