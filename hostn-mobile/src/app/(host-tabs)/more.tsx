import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  isLogout?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Profile', route: '/account/profile' },
  { icon: 'cash-outline', label: 'Earnings', route: '/host/earnings' },
  { icon: 'star-outline', label: 'Reviews', route: '/host/reviews' },
  { icon: 'wallet-outline', label: 'Wallet', route: '/account/wallet' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/account/notifications' },
  { icon: 'help-circle-outline', label: 'FAQ', route: '/account/faq' },
  { icon: 'document-text-outline', label: 'Terms of Use', route: '/account/terms' },
  { icon: 'lock-closed-outline', label: 'Privacy Policy', route: '/account/privacy' },
  { icon: 'log-out-outline', label: 'Logout', isLogout: true },
];

export default function HostMoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const initial = (user?.name ?? '?').charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/phone-entry');
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.name}>{user?.name || 'Host'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Host</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map(({ icon, label, route, isLogout }) => (
            <TouchableOpacity
              key={label}
              style={styles.menuItem}
              onPress={isLogout ? handleLogout : () => route && router.push(route as never)}
            >
              <Ionicons name={icon} size={22} color={isLogout ? '#dc2626' : Colors.textSecondary} />
              <Text style={[styles.menuLabel, isLogout && { color: '#dc2626' }]}>{label}</Text>
              {!isLogout && <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{ marginStart: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.textPrimary },
  roleBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start', marginTop: 4 },
  roleText: { color: '#059669', fontSize: 12, fontWeight: '600' },
  menuSection: { backgroundColor: Colors.background, borderRadius: Radius.lg, ...Shadows.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
});
