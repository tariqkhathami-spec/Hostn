import React, { useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { hostService } from '../../services/host.service';
import type { Property } from '../../types';

// Type for display unit (from API or fallback)
interface DisplayUnit {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  status: string;
  image: string | null;
}

interface DisplayProperty {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  city: string;
  area: string;
  unitCount: number;
  units: DisplayUnit[];
}

export default function PropertiesScreen() {
  const router = useRouter();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const properties: Property[] = data?.data ?? [];

  // Map API property groups to display format. Pre-fix this only ever
  // returned properties[0] — hosts with 2+ properties saw only the first.
  const displayProperties: DisplayProperty[] = properties.map((p) => ({
    id: p.id,
    nameAr: p.nameAr || p.name || '',
    nameEn: p.name || '',
    status: p.status || 'listed',
    city: p.address?.city || '',
    area: p.address?.street ? `${p.address.direction || ''}، ${p.address.street}` : '',
    unitCount: p.unitCount || p.units?.length || 0,
    units: (p.units || []).map((u) => ({
      id: u.id,
      nameAr: u.name || '',
      nameEn: '',
      code: u.code || '',
      status: u.status || 'listed',
      image: ((): string | null => {
        const first = u.images?.[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && 'url' in first) return first.url;
        return u.photos?.[0] ?? null;
      })(),
    })),
  }));

  const handleUnitPress = useCallback(
    (unitId: string) => {
      router.push(`/property/unit/${unitId}` as any);
    },
    [router],
  );

  const renderUnitItem = useCallback(
    ({ item, section }: { item: DisplayUnit; section: { property: DisplayProperty } }) => {
      const isListed = item.status === 'listed';
      const property = section.property;
      return (
        <TouchableOpacity
          style={styles.unitRow}
          activeOpacity={0.7}
          onPress={() => handleUnitPress(item.id)}
        >
          {/* Left arrow for navigation */}
          <View style={styles.unitArrow}>
            <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
          </View>

          {/* Unit info - center */}
          <View style={styles.unitInfo}>
            <Text style={styles.unitName}>
              {item.nameAr} {item.nameEn}
            </Text>
            <Text style={styles.unitCode}>
              {'كود الوحدة (' + item.code + ')'}
            </Text>
            {isListed ? (
              <Text style={styles.statusOnline}>معروض (أون لاين)</Text>
            ) : (
              <Text style={styles.statusOffline}>غير معروض (أوف لاين)</Text>
            )}
          </View>

          {/* Right: thumbnail + action buttons */}
          <View style={styles.unitActions}>
            <View style={styles.unitThumbnail}>
              <Ionicons name="image-outline" size={28} color={Colors.textTertiary} />
            </View>
            <View style={styles.unitActionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push(`/property/edit-unit/${item.id}` as any);
                }}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>تعديل</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push(`/property/unit-pricing/${item.id}` as any);
                }}
              >
                <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>تسعير</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.duplicateBtn}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push({
                    pathname: `/property/duplicate/${item.id}` as any,
                    params: {
                      groupTag: property.nameAr || property.nameEn || '',
                    },
                  });
                }}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                <Text style={styles.duplicateBtnText}>نسخ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleUnitPress, router],
  );

  const keyExtractor = useCallback((item: DisplayUnit) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { property: DisplayProperty } }) => {
      const property = section.property;
      return (
        <View style={styles.propertyCard}>
          {/* Property name */}
          <Text style={styles.propertyName}>
            {property.nameAr} {property.nameEn}
          </Text>

          {/* Status */}
          {property.status === 'listed' ? (
            <Text style={styles.statusOnline}>معروض (أون لاين)</Text>
          ) : (
            <Text style={styles.statusOffline}>غير معروض (أوف لاين)</Text>
          )}

          {/* Location row */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {property.city} و {property.area}
            </Text>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
          </View>

          {/* Unit count row */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{property.unitCount} وحدات</Text>
            <Ionicons
              name="bed-outline"
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
          </View>

          {/* Add Unit button */}
          <TouchableOpacity
            style={styles.addUnitBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/property/add-unit' as any,
                params: {
                  propertyId: property.id,
                  groupTag: property.nameAr || property.nameEn,
                  city: property.city,
                  district: '',
                  type: '',
                },
              })
            }
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addUnitText}>إضافة وحدة جديدة</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [router],
  );

  const sections = displayProperties.map((p) => ({
    key: p.id,
    property: p,
    data: p.units,
  }));

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any)}>
          <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('properties.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : displayProperties.length > 0 ? (
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderUnitItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.centered}>
            <Ionicons name="business-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>{t('common.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('properties.title')}</Text>
          </View>
        )}
      </View>

      {/* FAB - Add Property */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/property/create' as any)}
      >
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.fabText}>إضافة عقار</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // Content
  content: {
    flex: 1,
  },
  listContent: {
    // Clearance for the floating FAB (`bottom: 110` + ~44 px height + buffer).
    // Pre-fix this was 88; the last unit row was hidden under the button.
    paddingBottom: 170,
  },
  sectionSeparator: {
    height: Spacing.md,
  },

  // Property card
  propertyCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.base,
    ...Shadows.card,
  },
  propertyName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  statusOffline: {
    ...Typography.small,
    color: Colors.error,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  statusOnline: {
    ...Typography.small,
    color: Colors.success,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  infoIcon: {
    // icon sits to the right of text in RTL layout
  },

  // Unit list
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  unitArrow: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitInfo: {
    flex: 1,
    marginHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  unitName: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 2,
  },
  unitCode: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 2,
  },
  unitThumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
  },

  // States
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
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    ...Typography.small,
    color: Colors.textTertiary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: Spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    ...Typography.smallBold,
    color: Colors.white,
  },

  // Add Unit button
  addUnitBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addUnitText: {
    ...Typography.smallBold,
    color: Colors.primary,
  },

  // Unit actions (right side)
  unitActions: {
    alignItems: 'center' as const,
    gap: Spacing.xs,
  },

  // Unit action row
  unitActionRow: {
    flexDirection: 'row' as const,
    gap: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary + '10',
  },
  actionBtnText: {
    ...Typography.tiny,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  // Duplicate button
  duplicateBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary + '10',
  },
  duplicateBtnText: {
    ...Typography.tiny,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
