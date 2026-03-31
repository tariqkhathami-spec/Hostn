import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

type MenuIcon = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: MenuIcon;
  label: string;
  route: string;
  color?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Profile', route: '/account/profile' },
  { icon: 'wallet-outline', label: 'Wallet', route: '/account/wallet' },
  { icon: 'card-outline', label: 'Payment Methods', route: '/account/payment-methods' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/account/notifications' },
  { icon: 'help-circle-outline', label: 'FAQ', route: '/account/faq' },
  { icon: 'document-text-outline', label: 'Terms of Use', route: '/account/terms' },
  { icon: 'shield-checkmark-outline', label: 'Privacy Policy', route: '/account/privacy' },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
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
        <Text style={styles.header}>Account</Text>

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
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}` : 'Guest'}
            </Text>
            <Text style={styles.profilePhone}>{user?.phone ?? ''}</Text>
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
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
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
  },
  logoutText: { ...Typography.body, color: Colors.error },
});
