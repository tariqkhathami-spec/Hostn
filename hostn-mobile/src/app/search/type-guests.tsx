import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { PROPERTY_TYPES } from '../../constants/config';
import { useSearchStore } from '../../store/searchStore';
import type { PropertyType } from '../../types';

function CounterRow({
  label,
  subtitle,
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max = 20,
}: {
  label: string;
  subtitle: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterInfo}>
        <Text style={styles.counterLabel}>{label}</Text>
        <Text style={styles.counterSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.counterControls}>
        <TouchableOpacity
          style={[
            styles.counterButton,
            value <= min && styles.counterButtonDisabled,
          ]}
          onPress={onDecrement}
          disabled={value <= min}
        >
          <Ionicons
            name="remove"
            size={20}
            color={value <= min ? Colors.textLight : Colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity
          style={[
            styles.counterButton,
            value >= max && styles.counterButtonDisabled,
          ]}
          onPress={onIncrement}
          disabled={value >= max}
        >
          <Ionicons
            name="add"
            size={20}
            color={value >= max ? Colors.textLight : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TypeGuestsScreen() {
  const router = useRouter();
  const {
    propertyTypes: storedTypes,
    guests: storedGuests,
    togglePropertyType,
    setGuests,
  } = useSearchStore();

  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(storedTypes);
  const [adults, setAdults] = useState(storedGuests.adults);
  const [children, setChildren] = useState(storedGuests.children);

  const handleToggleType = (type: PropertyType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleContinue = () => {
    selectedTypes.forEach((type) => {
      if (!storedTypes.includes(type)) togglePropertyType(type);
    });
    storedTypes.forEach((type) => {
      if (!selectedTypes.includes(type)) togglePropertyType(type);
    });
    setGuests({ adults, children });
    router.push('/search/dates');
  };

  return (
    <ScreenWrapper>
      <HeaderBar title="Type & Guests" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Property Types */}
        <Text style={styles.sectionTitle}>Property Type</Text>
        <View style={styles.typesGrid}>
          {PROPERTY_TYPES.map((item) => {
            const isSelected = selectedTypes.includes(item.key as PropertyType);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.typeChip,
                  isSelected && styles.typeChipSelected,
                ]}
                onPress={() => handleToggleType(item.key as PropertyType)}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.primary}
                    style={styles.typeCheckmark}
                  />
                )}
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected && styles.typeLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Guest Counters */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Guests
        </Text>
        <View style={styles.countersContainer}>
          <CounterRow
            label="Adults"
            subtitle="13+ years"
            value={adults}
            min={1}
            onIncrement={() => setAdults((v) => v + 1)}
            onDecrement={() => setAdults((v) => Math.max(1, v - 1))}
          />
          <View style={styles.counterSeparator} />
          <CounterRow
            label="Children"
            subtitle="12 years and under"
            value={children}
            min={0}
            onIncrement={() => setChildren((v) => v + 1)}
            onDecrement={() => setChildren((v) => Math.max(0, v - 1))}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.bottomBar, Shadows.bottomBar]}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 120,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  typeCheckmark: {
    marginRight: Spacing.xs,
  },
  typeLabel: {
    ...Typography.small,
    color: Colors.textPrimary,
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  countersContainer: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  counterInfo: {
    flex: 1,
  },
  counterLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  counterSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonDisabled: {
    borderColor: Colors.borderLight,
  },
  counterValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  counterSeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
