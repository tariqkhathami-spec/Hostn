import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import UnitCard from '../../components/properties/UnitCard';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { Unit } from '../../types';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['property', id],
    queryFn: () => hostService.getProperty(id!),
    enabled: !!id,
    retry: false,
  });

  const property = data?.data;

  const handleUnitPress = useCallback(
    (unitId: string) => {
      router.push(`/property/unit/${unitId}`);
    },
    [router],
  );

  const renderUnit = useCallback(
    ({ item }: { item: Unit }) => (
      <UnitCard unit={item} onPress={() => handleUnitPress(item.id)} />
    ),
    [handleUnitPress],
  );

  const keyExtractor = useCallback((item: Unit) => item.id, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="..." showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !property) {
    return (
      <ScreenWrapper>
        <HeaderBar title="خطأ" showBack />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل بيانات العقار</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title={property.nameAr || property.name} showBack />

      <FlatList
        data={property.units}
        keyExtractor={keyExtractor}
        renderItem={renderUnit}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Property info section */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>معلومات العقار</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{property.nameAr || property.name}</Text>
                <Text style={styles.infoLabel}>اسم العقار</Text>
              </View>

              {property.classification && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoValue}>{property.classification}</Text>
                  <Text style={styles.infoLabel}>التصنيف</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>
                  {[property.address?.street, property.address?.city].filter(Boolean).join('، ')}
                </Text>
                <Text style={styles.infoLabel}>العنوان</Text>
              </View>
            </View>

            {/* Map placeholder */}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="location" size={32} color={Colors.textTertiary} />
              <Text style={styles.mapText}>الموقع على الخريطة</Text>
            </View>

            {/* Units header */}
            <Text style={styles.sectionTitle}>الوحدات ({property.units?.length ?? 0})</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyUnits}>
            <Ionicons name="cube-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>لا توجد وحدات لهذا العقار</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
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
  infoSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.small,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  mapText: {
    ...Typography.small,
    color: Colors.textTertiary,
  },
  emptyUnits: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
});
