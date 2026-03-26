import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { APP_CONFIG } from '../../constants/config';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  isLogout?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Profile', route: '/account/profile' },
  { icon: 'wallet-outline', label: 'Wallet', route: '/account/wallet' },
  { icon: 'card-outline', label: 'Payment Methods', route: '/account/payment-methods' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/account/notifications' },
  { icon: 'help-circle-outline', label: 'FAQ', route: '/account/faq' },
  { icon: 'document-text-outline', label: 'Terms of Use', route: '/account/terms' },
  { icon: 'lock-closed-outline', label: 'Privacy Policy', route: '/account/privacy' },
  { icon: 'share-social-outline', label: 'Invite Friends', route: '/account/invite' },
  { icon: 'log-out-outline', label: 'Logout', isLogout: true },
];

interface QuickLink {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const QUICK_LINKS: QuickLink[] = [
  { icon: 'calendar-outline', label: 'Reservations', route: '/(tabs)/bookings' },
  { icon: 'wallet-outline', label: 'Wallet', route: '/account/wallet' },
  { icon: 'star-outline', label: 'Ratings', route: '/account/ratings' },
];

export default function MoreScreen() {
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

  const handleMenuPress = (item: MenuItem) => {
    if (item.isLogout) {
      handleLogout();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? 'Guest'}</Text>
            <Text style={styles.userRole}>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : 'Guest'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/account/profile' as any)}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <View style={[styles.quickLinksRow, Shadows.card]}>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.quickLink}
              onPress={() => router.push(link.route as any)}
            >
              <View style={styles.quickLinkIcon}>
                <Ionicons name={link.icon} size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickLinkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, Shadows.card]}>
          {MENU_ITEMS.map((item, index) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuPress(item)}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.isLogout ? Colors.error : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    item.isLogout && styles.menuLabelLogout,
                  ]}
                >
                  {item.label}
                </Text>
                {!item.isLogout && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.textLight}
                  />
                )}
              </TouchableOpacity>
              {index < MENU_ITEMS.length - 1 && (
                <View style={styles.menuSeparator} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>V {APP_CONFIG.version}</Text>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h2,
    color: Colors.textWhite,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  userRole: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.card,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.base,
  },
  quickLink: {
    alignItems: 'center',
    flex: 1,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  quickLinkLabel: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  menuContainer: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
  },
  menuLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuLabelLogout: {
    color: Colors.error,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 22 + Spacing.md,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
