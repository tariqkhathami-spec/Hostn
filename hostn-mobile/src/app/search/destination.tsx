import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { SAUDI_CITIES } from '../../constants/cities';
import { useSearchStore } from '../../store/searchStore';

export default function DestinationScreen() {
  const router = useRouter();
  const { destination, setDestination } = useSearchStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(destination);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return [...SAUDI_CITIES];
    const lower = search.toLowerCase();
    return SAUDI_CITIES.filter((city) =>
      city.toLowerCase().includes(lower),
    );
  }, [search]);

  const handleContinue = () => {
    setDestination(selected);
    router.push('/search/type-guests');
  };

  return (
    <ScreenWrapper>
      <HeaderBar
        title="Choose Destination"
        rightIcon="close"
        onRightPress={() => router.back()}
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cities..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* City List */}
      <FlatList
        data={filteredCities}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              style={[styles.cityRow, isSelected && styles.cityRowSelected]}
              onPress={() => setSelected(isSelected ? null : item)}
            >
              <View style={styles.cityInfo}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={isSelected ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.cityName,
                    isSelected && styles.cityNameSelected,
                  ]}
                >
                  {item}
                </Text>
              </View>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.primary}
                />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No cities found</Text>
          </View>
        }
      />

      {/* Continue Button */}
      <View style={[styles.bottomBar, Shadows.bottomBar]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selected && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  cityRowSelected: {
    backgroundColor: Colors.surface,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityName: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
  },
  cityNameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
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
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
