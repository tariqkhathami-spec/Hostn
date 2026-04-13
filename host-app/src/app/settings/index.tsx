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
    label: 'مدراء الحجوزات',
    icon: 'people-outline',
    route: '/settings/managers',
  },
  {
    label: 'إعدادات الحجز',
    icon: 'calendar-outline',
    route: '/settings/booking-rules',
  },
  {
    label: 'ضريبة القيمة المضافة',
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
      Alert.alert('خطأ', 'حدث خطأ أثناء حذف الحساب');
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'تأكيد نهائي',
              'سيتم حذف حسابك وجميع بياناتك بشكل نهائي. هل تريد المتابعة؟',
              [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حذف نهائي', style: 'destructive', onPress: () => deleteMutation.mutate() },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar title={'الإعدادات'} showBack />
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
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف الحساب'}
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
