import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../store/searchStore';
import { PROPERTY_TYPES } from '../../constants/config';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

export default function TypeGuestsScreen() {
  const router = useRouter();
  const { propertyType, guests, setPropertyType, setGuests } = useSearchStore();

  const handleNext = () => {
    router.push('/search/dates');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Property & Guests</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Property Type */}
      <Text style={styles.sectionTitle}>Property Type</Text>
      <View style={styles.typeGrid}>
        {PROPERTY_TYPES.map((type) => (
          <Pressable
            key={type.id}
            style={[styles.typeCard, propertyType === type.id && styles.typeCardActive]}
            onPress={() => setPropertyType(propertyType === type.id ? null : type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={28}
              color={propertyType === type.id ? Colors.white : Colors.primary}
            />
            <Text
              style={[styles.typeLabel, propertyType === type.id && styles.typeLabelActive]}
            >
              {type.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Guests */}
      <Text style={styles.sectionTitle}>Number of Guests</Text>
      <View style={styles.guestRow}>
        <Pressable
          style={styles.guestButton}
          onPress={() => setGuests(guests - 1)}
          disabled={guests <= 1}
        >
          <Ionicons name="remove" size={24} color={guests <= 1 ? Colors.textTertiary : Colors.primary} />
        </Pressable>
        <Text style={styles.guestCount}>{guests}</Text>
        <Pressable style={styles.guestButton} onPress={() => setGuests(guests + 1)}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
        </Pressable>
      </View>
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
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  typeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  typeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeLabel: { ...Typography.caption, color: Colors.textPrimary },
  typeLabelActive: { color: Colors.white },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  guestButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestCount: { ...Typography.h2, color: Colors.textPrimary, minWidth: 40, textAlign: 'center' },
  footer: { flex: 1, justifyContent: 'flex-end', padding: Spacing.xl },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  nextText: { ...Typography.bodyBold, color: Colors.white },
});
