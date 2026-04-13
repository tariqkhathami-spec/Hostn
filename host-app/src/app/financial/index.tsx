import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const menuItems: MenuItem[] = [
  { icon: 'trending-up-outline', label: 'الأرباح', route: '/financial/earnings' },
  { icon: 'card-outline', label: 'طريقة الدفع', route: '/financial/payment-method' },
  { icon: 'time-outline', label: 'مدة التحويل', route: '/financial/transfer-duration' },
  { icon: 'swap-horizontal-outline', label: 'الحوالات البنكية', route: '/financial/transfers' },
  { icon: 'receipt-outline', label: 'الفواتير', route: '/invoices' },
  { icon: 'document-text-outline', label: 'كشوف الحسابات', route: '/invoices/statements' },
  { icon: 'pie-chart-outline', label: 'ملخص الحسابات', route: '/invoices/summary' },
];

export default function FinancialMenuScreen() {
  const router = useRouter();

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => hostService.getStats(),
    retry: false,
  });
  const totalEarnings = statsQuery.data?.data?.totalEarnings;

  return (
    <ScreenWrapper>
      <HeaderBar title="المعاملات المالية" showBack />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Earnings Summary Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsIconCircle}>
            <Ionicons name="wallet-outline" size={28} color={Colors.primary} />
          </View>
          {statsQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
          ) : (
            <Text style={styles.earningsAmount}>
              {(totalEarnings ?? 0).toLocaleString('en-US')} {'ريال'}
            </Text>
          )}
          <Text style={styles.earningsLabel}>{'إجمالي الأرباح'}</Text>
        </View>

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuCard}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color={Colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  earningsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary200,
    ...Shadows.card,
  },
  earningsIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  earningsAmount: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  earningsLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  menuLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
