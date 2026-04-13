import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { useAuthStore } from '../../store/authStore';
import { hostService } from '../../services/host.service';
import { formatPhoneDisplay } from '../../utils/format';

const menuItems = [
  { label: 'more.profile', icon: 'person-outline', route: '/profile' },
  { label: 'more.reviews', icon: 'star-outline', route: '/reviews' },
  { label: 'more.financial', icon: 'cash-outline', route: '/financial' },
  { label: 'more.permits', icon: 'document-text-outline', route: '/permits' },
  { label: 'more.pricing', icon: 'pricetag-outline', route: '/pricing' },
  { label: 'more.protection', icon: 'shield-checkmark-outline', route: '/protection' },
  { label: 'more.settings', icon: 'settings-outline', route: '/settings' },
  { label: 'more.suggestions', icon: 'bulb-outline', route: '/suggestions' },
  { label: 'more.articles', icon: 'newspaper-outline', route: '/content/articles' },
  { label: 'more.complaints', icon: 'warning-outline', route: '/content/complaints' },
  { label: 'more.changeRequests', icon: 'create-outline', route: '/content/change-requests' },
  { label: 'more.referrals', icon: 'link-outline', route: '/content/referrals' },
  { label: 'more.onboarding', icon: 'school-outline', route: '/(auth)/onboarding' },
  { label: 'more.invoices', icon: 'receipt-outline', route: '/invoices' },
  { label: 'more.terms', icon: 'checkmark-circle-outline', route: '/legal/terms', badge: 'تم التوقيع' },
  { label: 'more.contact', icon: 'call-outline', route: '/legal/contact' },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { host, logout } = useAuthStore();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Fetch real stats from API instead of hardcoded values
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['host-stats'],
    queryFn: () => hostService.getStats(),
    retry: false,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['host-properties-count'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const stats = statsData?.data;
  const properties = propertiesData?.data;
  const totalUnits = properties?.reduce((sum: number, p: any) => sum + (p.units?.length || 1), 0) || 0;
  const activeUnits = properties?.reduce((sum: number, p: any) => {
    if (p.units?.length) return sum + p.units.filter((u: any) => u.status === 'listed').length;
    return sum + (p.isActive ? 1 : 0);
  }, 0) || 0;

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/(auth)/phone-entry' as any);
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileRow}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{host?.name || ''}</Text>
              <Text style={styles.profileId}>{formatPhoneDisplay(host?.phone || '')}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>n</Text>
            </View>
          </View>
        </View>

        {/* Stats Row — fetched from API */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={20} color={Colors.textSecondary} style={styles.statIcon} />
              {statsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.statValue}>
                  {stats?.totalRevenue?.toLocaleString('en-SA') ?? '0'}
                </Text>
              )}
              <Text style={styles.statLabel}>{'المبيعات'}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="grid-outline" size={20} color={Colors.textSecondary} style={styles.statIcon} />
              {statsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.statValue}>
                  {stats?.totalBookings ?? '0'}
                </Text>
              )}
              <Text style={styles.statLabel}>{'الحجوزات'}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="home-outline" size={20} color={Colors.textSecondary} style={styles.statIcon} />
              <Text style={styles.statValue}>
                {`${totalUnits}/${activeUnits}`}
              </Text>
              <Text style={styles.statLabel}>{'الوحدات'}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.textTertiary} />
              {'badge' in item && item.badge ? (
                <Text style={styles.badgeText}>{item.badge}</Text>
              ) : null}
              <Text style={styles.menuLabel}>{t(item.label as any)}</Text>
              <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={18} color={Colors.textTertiary} />
            <Text style={[styles.menuLabel, { color: Colors.error }]}>{t('more.logout')}</Text>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{'هوستن'}</Text>
          <Text style={styles.version}>V 8.23.0</Text>
        </View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {'هل تريد تسجيل الخروج؟'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonConfirmText}>{'نعم'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  profileHeader: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  profileInfo: {
    alignItems: 'flex-end',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  profileName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  profileId: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginHorizontal: Spacing.md,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  footerBrand: {
    ...Typography.subtitle,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  version: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalButtonCancelText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.error,
  },
  modalButtonConfirmText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
