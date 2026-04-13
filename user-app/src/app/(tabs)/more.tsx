import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { formatPhone } from '../../utils/format';

type MenuIcon = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: MenuIcon;
  labelKey: string;
  route: string;
  color?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', labelKey: 'account.profile', route: '/account/profile' },
  { icon: 'wallet-outline', labelKey: 'account.wallet', route: '/account/wallet' },
  { icon: 'card-outline', labelKey: 'account.paymentMethods', route: '/account/payment-methods' },
  { icon: 'notifications-outline', labelKey: 'account.notifications', route: '/account/notifications' },
  { icon: 'help-circle-outline', labelKey: 'account.support', route: '/account/support' },
  { icon: 'information-circle-outline', labelKey: 'account.about', route: '/account/about' },
  { icon: 'mail-outline', labelKey: 'account.contactUs', route: '/account/contact' },
  { icon: 'newspaper-outline', labelKey: 'account.blog', route: '/account/blog' },
  { icon: 'information-circle-outline', labelKey: 'account.faq', route: '/account/faq' },
  { icon: 'document-text-outline', labelKey: 'account.terms', route: '/account/terms' },
  { icon: 'shield-checkmark-outline', labelKey: 'account.privacy', route: '/account/privacy' },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t, language, toggleLanguage } = useLanguage();

  const handleLogout = () => {
    Alert.alert(t('account.logout'), t('account.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>{t('account.title')}</Text>
          <Pressable style={styles.langToggle} onPress={toggleLanguage}>
            <Ionicons name="language-outline" size={18} color={Colors.primary} />
            <Text style={styles.langToggleText}>{language === 'ar' ? 'EN' : 'عربي'}</Text>
          </Pressable>
        </View>

        {/* Profile Card */}
        <Pressable style={styles.profileCard} onPress={() => router.push('/account/profile')}>
          <View style={styles.avatar}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={32} color={Colors.textSecondary} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}` : t('account.guest')}
            </Text>
            <Text style={styles.profilePhone}>{user?.phone ? formatPhone(user.phone, '+966') : ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Pressable>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.route}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon} size={22} color={item.color ?? Colors.textPrimary} />
              <Text style={[styles.menuLabel, item.color ? { color: item.color } : undefined]}>
                {t(item.labelKey as any)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>{t('account.logout')}</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={Colors.error} />
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  header: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  langToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  langToggleText: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56 },
  profileInfo: { flex: 1 },
  profileName: { ...Typography.bodyBold, color: Colors.textPrimary },
  profilePhone: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  menuSection: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  logoutText: { ...Typography.bodyBold, color: Colors.error },
});
