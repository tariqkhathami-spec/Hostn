import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START, DirectionalIcon } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { hostService } from '../../services/host.service';
import { apiErrorMessage } from '../../utils/apiError';
import { cityLabel, districtLabel } from '../../constants/listings';
import type { Property } from '../../types';

// A row under a property: a real Unit document (GET /host/properties).
interface DisplayUnit {
  /** Unit _id — what the edit / pricing / detail / duplicate screens need. */
  id: string;
  /** _id of the property this unit belongs to. */
  propertyId: string;
  name: string;
  code: string;
  status: string;
  image: string | null;
  /** Arabic names of what is still missing before guests can see the unit. */
  missing: string[];
}

interface DisplayProperty {
  id: string;
  name: string;
  status: string;
  type: string;
  location: string;
  rejected: boolean;
  moderationNote: string;
  units: DisplayUnit[];
}

const ISSUE_LABELS: Record<string, string> = {
  missing_name: 'الاسم',
  missing_price: 'السعر',
  missing_photos: 'الصور',
};

/** Arabic count of units: وحدة واحدة / وحدتان / 3 وحدات / 11 وحدة. */
function unitsCountLabel(n: number): string {
  if (n <= 0) return 'لا توجد وحدات بعد';
  if (n === 1) return 'وحدة واحدة';
  if (n === 2) return 'وحدتان';
  if (n <= 10) return `${n} وحدات`;
  return `${n} وحدة`;
}

const isHttpUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

export default function PropertiesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Unit id with a status change / delete in flight (its buttons are disabled).
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const properties: Property[] = data?.data ?? [];

  const displayProperties: DisplayProperty[] = properties.map((p) => {
    const city = p.address?.city || p.location?.city || '';
    // `address.direction` carries the district, `address.street` the street.
    const district = p.address?.direction || p.location?.district || '';
    const location = [cityLabel(city, 'ar'), districtLabel(city, district, 'ar'), p.address?.street || '']
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join('، ');
    return {
      id: String(p.id || p._id || ''),
      name: p.nameAr || p.name || p.titleAr || p.title || '',
      status: p.status || 'listed',
      type: p.classification || p.type || '',
      location,
      rejected: p.isApproved === false,
      moderationNote: (p.moderationNote || '').trim(),
      units: (p.units || []).map((u) => {
        const first = u.images?.[0];
        const url =
          typeof first === 'string' ? first
          : first && typeof first === 'object' && 'url' in first ? first.url
          : u.photos?.[0];
        return {
          id: String(u.id || u._id || ''),
          propertyId: String(u.propertyId || p.id || ''),
          name: (u.nameAr || u.nameEn || '').trim(),
          code: u.code || '',
          status: u.status || 'listed',
          image: isHttpUrl(url) ? url : null,
          missing: (u.publishIssues || []).map((issue) => ISSUE_LABELS[issue]).filter(Boolean),
        };
      }),
    };
  });

  const openAddUnit = useCallback(
    (propertyId: string) => {
      if (!propertyId) return;
      router.push({ pathname: '/property/add-unit' as any, params: { propertyId } });
    },
    [router],
  );

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  }, [queryClient]);

  // ── Unlist / relist ────────────────────────────────────────────────
  const changeUnitStatus = useCallback(
    async (unit: DisplayUnit, status: 'listed' | 'unlisted') => {
      setBusyUnitId(unit.id);
      try {
        await hostService.toggleUnitStatus(unit.id, status);
        queryClient.invalidateQueries({ queryKey: ['unit', unit.id] });
        refreshList();
      } catch (e) {
        Alert.alert(
          'خطأ',
          apiErrorMessage(e, status === 'listed' ? 'تعذّر عرض الوحدة. حاول مرة أخرى.' : 'تعذّر إيقاف عرض الوحدة. حاول مرة أخرى.'),
        );
      } finally {
        setBusyUnitId(null);
      }
    },
    [queryClient, refreshList],
  );

  const confirmToggleUnit = useCallback(
    (unit: DisplayUnit, property: DisplayProperty) => {
      const label = unit.name || 'هذه الوحدة';
      if (unit.status === 'listed') {
        Alert.alert(
          'إيقاف عرض الوحدة',
          `لن تظهر «${label}» للضيوف ولن تستقبل حجوزات جديدة حتى تعيد عرضها. الحجوزات القائمة لا تتأثر.`,
          [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'إيقاف العرض', style: 'destructive', onPress: () => changeUnitStatus(unit, 'unlisted') },
          ],
        );
        return;
      }
      if (property.rejected) {
        Alert.alert(
          'لا يمكن عرض الوحدة',
          `هذا العقار مرفوض من إدارة هوستن${property.moderationNote ? `:\n${property.moderationNote}` : '.'}\nعالج الملاحظات ثم تواصل مع الدعم لإعادة المراجعة.`,
        );
        return;
      }
      const incomplete = unit.missing.length > 0
        ? `\n\nتنبيه: الوحدة غير مكتملة (ينقصها: ${unit.missing.join('، ')}) ولن تظهر للضيوف حتى تكتمل.`
        : '';
      Alert.alert(
        'عرض الوحدة',
        `ستظهر «${label}» للضيوف وتصبح متاحة للحجز.${incomplete}`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'عرض الوحدة', onPress: () => changeUnitStatus(unit, 'listed') },
        ],
      );
    },
    [changeUnitStatus],
  );

  // ── Delete ─────────────────────────────────────────────────────────
  const confirmDeleteUnit = useCallback(
    (unit: DisplayUnit) => {
      Alert.alert(
        'حذف الوحدة',
        `هل تريد حذف «${unit.name || 'هذه الوحدة'}»؟ ستختفي من قائمتك ومن نتائج البحث، ولا يمكن التراجع عن الحذف من التطبيق.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: async () => {
              setBusyUnitId(unit.id);
              try {
                await hostService.deleteUnit(unit.id);
                refreshList();
              } catch (e) {
                Alert.alert('خطأ', apiErrorMessage(e, 'تعذّر حذف الوحدة. حاول مرة أخرى.'));
              } finally {
                setBusyUnitId(null);
              }
            },
          },
        ],
      );
    },
    [refreshList],
  );

  const renderUnitItem = useCallback(
    ({ item, section }: { item: DisplayUnit; section: { property: DisplayProperty } }) => {
      const isListed = item.status === 'listed';
      const incomplete = item.missing.length > 0;
      const busy = busyUnitId === item.id;
      return (
        <View style={styles.unitCard}>
          <TouchableOpacity
            style={styles.unitRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/property/unit/${item.id}` as any)}
          >
            {/* Thumbnail first, then the unit info, then the arrow */}
            <View style={styles.unitThumbnail}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.unitThumbnailImage} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={28} color={Colors.textTertiary} />
              )}
            </View>

            <View style={styles.unitInfo}>
              <Text style={[styles.unitName, !item.name && styles.unitNameMissing]} numberOfLines={2}>
                {item.name || 'وحدة بدون اسم'}
              </Text>
              {!!item.code && (
                <Text style={styles.unitCode}>{'كود الوحدة (' + item.code + ')'}</Text>
              )}
              {incomplete ? (
                <Text style={styles.statusOffline}>مخفية عن الضيوف</Text>
              ) : isListed ? (
                <Text style={styles.statusOnline}>معروضة للضيوف</Text>
              ) : (
                <Text style={styles.statusOffline}>متوقفة عن العرض</Text>
              )}
            </View>

            <View style={styles.unitArrow}>
              <Ionicons name={DirectionalIcon.forward} size={20} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Incomplete notice */}
          {incomplete && (
            <View style={styles.incompleteBox}>
              <View style={styles.incompleteBadge}>
                <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                <Text style={styles.incompleteBadgeText}>غير مكتملة</Text>
              </View>
              <Text style={styles.incompleteText}>
                {`ينقصها: ${item.missing.join('، ')}. هذه الوحدة مخفية عن الضيوف حتى تكتمل بياناتها.`}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.unitActionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              hitSlop={6}
              onPress={() => router.push(`/property/edit-unit/${item.id}` as any)}
            >
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>تعديل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              hitSlop={6}
              onPress={() => router.push(`/property/unit-pricing/${item.id}` as any)}
            >
              <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>تسعير</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              hitSlop={6}
              onPress={() => router.push(`/property/duplicate/${item.id}` as any)}
            >
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>نسخ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, busy && styles.actionBtnDisabled]}
              hitSlop={6}
              disabled={busy}
              onPress={() => confirmToggleUnit(item, section.property)}
            >
              <Ionicons name={isListed ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>{isListed ? 'إيقاف العرض' : 'عرض'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger, busy && styles.actionBtnDisabled]}
              hitSlop={6}
              disabled={busy}
              onPress={() => confirmDeleteUnit(item)}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>حذف</Text>
            </TouchableOpacity>
            {busy && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
        </View>
      );
    },
    [router, busyUnitId, confirmToggleUnit, confirmDeleteUnit],
  );

  const keyExtractor = useCallback((item: DisplayUnit) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { property: DisplayProperty } }) => {
      const property = section.property;
      const hasUnits = property.units.length > 0;
      return (
        <View style={styles.propertyCard}>
          {/* Property name + edit */}
          <View style={styles.propertyTitleRow}>
            <Text style={[styles.propertyName, styles.propertyNameFlex]} numberOfLines={2}>
              {property.name || 'عقار بدون اسم'}
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              hitSlop={8}
              onPress={() => router.push(`/property/edit/${property.id}` as any)}
            >
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>تعديل العقار</Text>
            </TouchableOpacity>
          </View>

          {/* Status */}
          {property.rejected ? (
            <Text style={styles.statusOffline}>
              {`مرفوض من الإدارة${property.moderationNote ? `: ${property.moderationNote}` : ''}`}
            </Text>
          ) : property.status === 'listed' ? (
            <Text style={styles.statusOnline}>معروض للضيوف</Text>
          ) : (
            <Text style={styles.statusOffline}>متوقف عن العرض</Text>
          )}

          {/* Location row */}
          {!!property.location && (
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={Colors.textSecondary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>{property.location}</Text>
            </View>
          )}

          {/* Unit count row */}
          <View style={styles.infoRow}>
            <Ionicons
              name="bed-outline"
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>{unitsCountLabel(property.units.length)}</Text>
          </View>

          {hasUnits ? (
            <TouchableOpacity
              style={styles.addUnitBtn}
              activeOpacity={0.7}
              onPress={() => openAddUnit(property.id)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addUnitText}>إضافة وحدة جديدة</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.firstUnitBox}>
              <Text style={styles.firstUnitText}>
                هذا العقار لا يحتوي على أي وحدة، لذلك لا يظهر للضيوف ولا يمكن حجزه. أضف وحدة باسمها وسعرها وصورها ليبدأ استقبال الحجوزات.
              </Text>
              <TouchableOpacity
                style={styles.firstUnitBtn}
                activeOpacity={0.8}
                onPress={() => openAddUnit(property.id)}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.firstUnitBtnText}>أضف أول وحدة</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [router, openAddUnit],
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
          <Ionicons name={DirectionalIcon.back} size={24} color={Colors.textPrimary} />
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
        ) : isError ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>تعذّر تحميل العقارات</Text>
            <Text style={styles.emptySubtext}>تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.</Text>
            <TouchableOpacity style={styles.firstUnitBtn} onPress={() => refetch()}>
              <Text style={styles.firstUnitBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
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
            <Text style={styles.emptyText}>لا توجد عقارات بعد</Text>
            <Text style={styles.emptySubtext}>اضغط «إضافة عقار» لإنشاء عقارك الأول ثم أضف وحداته.</Text>
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
    textAlign: TEXT_START,
    marginBottom: Spacing.xs,
  },
  statusOffline: {
    ...Typography.small,
    color: Colors.error,
    textAlign: TEXT_START,
    marginBottom: Spacing.sm,
  },
  statusOnline: {
    ...Typography.small,
    color: Colors.success,
    textAlign: TEXT_START,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginStart: Spacing.xs,
  },
  infoIcon: {
    // the icon leads the text
  },

  // Unit list
  unitCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitNameMissing: {
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  unitThumbnailImage: {
    width: '100%',
    height: '100%',
  },

  // Incomplete unit notice
  incompleteBox: {
    backgroundColor: Colors.warning + '14',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
    padding: Spacing.sm,
    gap: 4,
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incompleteBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: '#b45309',
  },
  incompleteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Property title row
  propertyTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  propertyNameFlex: {
    flex: 1,
  },

  // First unit call to action
  firstUnitBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
    alignItems: 'center',
  },
  firstUnitText: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  firstUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  firstUnitBtnText: {
    ...Typography.smallBold,
    color: Colors.white,
  },
  unitArrow: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitInfo: {
    flex: 1,
    marginHorizontal: Spacing.md,
    alignItems: 'flex-start',
  },
  unitName: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: 2,
  },
  unitCode: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
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
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    end: Spacing.xl,
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

  // Unit action row
  unitActionRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary + '10',
  },
  actionBtnDanger: {
    backgroundColor: Colors.error + '10',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
