import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const menuItems: MenuItem[] = [
  {
    label: '\u0645\u062F\u0631\u0627\u0621 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A',
    icon: 'people-outline',
    route: '/settings/managers',
  },
  {
    label: '\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062D\u062C\u0632',
    icon: 'calendar-outline',
    route: '/settings/booking-rules',
  },
  {
    label: '\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629',
    icon: 'receipt-outline',
    route: '/settings/vat',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const deleteMutation = useMutation({
    mutationFn: () => hostService.deleteAccount(),
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/onboarding' as any);
    },
    onError: () => {
      Alert.alert('\u062E\u0637\u0623', '\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628');
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      '\u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628',
      '\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F\u061F \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0639\u0646\u0647.',
      [
        { text: '\u0625\u0644\u063A\u0627\u0621', style: 'cancel' },
        {
          text: '\u062D\u0630\u0641',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '\u062A\u0623\u0643\u064A\u062F \u0646\u0647\u0627\u0626\u064A',
              '\u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0648\u062C\u0645\u064A\u0639 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0628\u0634\u0643\u0644 \u0646\u0647\u0627\u0626\u064A. \u0647\u0644 \u062A\u0631\u064A\u062F \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629\u061F',
              [
                { text: '\u0625\u0644\u063A\u0627\u0621', style: 'cancel' },
                { text: '\u062D\u0630\u0641 \u0646\u0647\u0627\u0626\u064A', style: 'destructive', onPress: () => deleteMutation.mutate() },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar title={'\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A'} showBack />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.card}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account Section */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleteMutation.isPending}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.deleteButtonText}>
              {deleteMutation.isPending ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0630\u0641...' : '\u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  container: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  deleteSection: {
    padding: Spacing.base,
    marginTop: Spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
  },
  deleteButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
});
