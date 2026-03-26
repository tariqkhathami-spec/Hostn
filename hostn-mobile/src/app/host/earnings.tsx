import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { Ionicons } from '@expo/vector-icons';

interface MonthlyEarning {
  month: number;
  year: number;
  total: number;
  bookings: number;
}

export default function EarningsScreen() {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthly, setMonthly] = useState<MonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await hostService.getEarnings();
        setTotalEarnings(data.totalEarnings || data.data?.totalEarnings || 0);
        setMonthly(data.monthlyEarnings || data.data?.monthlyEarnings || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ headerShown: true, title: 'Earnings', headerBackTitle: 'Back' }} />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <ScrollView style={styles.container}>
          {/* Total Card */}
          <View style={styles.totalCard}>
            <Ionicons name="cash-outline" size={32} color="#d97706" />
            <Text style={styles.totalLabel}>Total Earnings</Text>
            <Text style={styles.totalValue}>{totalEarnings.toLocaleString()} SAR</Text>
          </View>

          {/* Monthly Breakdown */}
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {monthly.length === 0 ? (
            <Text style={styles.emptyText}>No earnings data yet</Text>
          ) : (
            monthly.map((item, i) => (
              <View key={i} style={styles.monthRow}>
                <Text style={styles.monthName}>{monthNames[item.month - 1]} {item.year}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.monthAmount}>{item.total.toLocaleString()} SAR</Text>
                  <Text style={styles.monthBookings}>{item.bookings} bookings</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  totalCard: {
    backgroundColor: '#fffbeb',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  totalLabel: { ...Typography.body, color: Colors.textSecondary },
  totalValue: { fontSize: 32, fontWeight: '800', color: '#d97706' },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  monthName: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  monthAmount: { ...Typography.body, fontWeight: '700', color: Colors.primary },
  monthBookings: { ...Typography.caption, color: Colors.textSecondary },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
});
