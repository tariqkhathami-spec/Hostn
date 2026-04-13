import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { Property, Unit } from '../../types';

export default function PricingIndexScreen() {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    data: propertiesData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const properties: Property[] = propertiesData?.data ?? [];
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;
  const units: Unit[] = selectedProperty?.units ?? [];

  const handlePropertySelect = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setDropdownOpen(false);
  }, []);

  const handleUnitPress = useCallback(
    (unitId: string) => {
      router.push(`/pricing/${unitId}`);
    },
    [router],
  );

  const renderUnit = useCallback(
    ({ item }: { item: Unit }) => (
      <TouchableOpacity
        style={styles.unitCard}
        onPress={() => handleUnitPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.unitInfo}>
          <Text style={styles.unitName}>{item.name}</Text>
          <Text style={styles.unitCode}>{item.code}</Text>
          {selectedProperty && (
            <Text style={styles.unitProperty}>{selectedProperty.nameAr || selectedProperty.name}</Text>
          )}
        </View>
        <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    ),
    [handleUnitPress, selectedProperty],
  );

  const keyExtractor = useCallback((item: Unit) => item.id, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title={'الأسعار'} showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{'جاري التحميل...'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <HeaderBar title={'الأسعار'} showBack />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{'حدث خطأ في تحميل العقارات'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title={'الأسعار'} showBack />

      <View style={styles.container}>
        {/* Property Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>{'اختر العقار'}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSecondary}
            />
            <Text style={styles.dropdownButtonText}>
              {selectedProperty
                ? selectedProperty.nameAr || selectedProperty.name
                : 'اختر عقاراً'}
            </Text>
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.dropdownItem,
                    selectedPropertyId === property.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handlePropertySelect(property.id)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedPropertyId === property.id && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {property.nameAr || property.name}
                  </Text>
                  {selectedPropertyId === property.id && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Units List */}
        {selectedProperty ? (
          <FlatList
            data={units}
            keyExtractor={keyExtractor}
            renderItem={renderUnit}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{'لا توجد وحدات لهذا العقار'}</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>{'اختر عقاراً لعرض الوحدات'}</Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  dropdownContainer: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownLabel: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  dropdownButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  dropdownList: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary50,
  },
  dropdownItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  unitInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  unitName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  unitCode: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  unitProperty: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
