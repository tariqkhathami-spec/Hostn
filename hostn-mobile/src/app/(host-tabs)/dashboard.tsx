import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { Ionicons } from '@expo/vector-icons';

interface Stats {
  totalProperties: number;
  activeBookings: number;
  totalEarnings: number;
  averageRating: number;
}

export default function HostDashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await hostService.getStats();
      setStats(data.stats || data.data || data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const cards = [
    { label: 'Properties', value: stats?.totalProperties ?? 0, icon: 'home-outline' as const, color: '#059669' },
    { label: 'Active Bookings', value: stats?.activeBookings ?? 0, icon: 'calendar-outline' as const, color: '#7c3aed' },
    { label: 'Earnings', value: `${(stats?.totalEarnings ?? 0).toLocaleString()} SAR`, icon: 'cash-outline' as const, color: '#d97706' },
    { label: 'Avg Rating', value: stats?.averageRating?.toFixed(1) ?? '—', icon: 'star-outline' as const, color: '#dc2626' },
  ];

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
      >
        <Text style={styles.heading}>Host Dashboard</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
        ) : (
          <View style={styles.grid}>
            {cards.map(({ label, value, icon, color }) => (
              <View key={label} style={styles.card}>
                <Ionicons name={icon} size={28} color={color} />
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  heading: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: {
    width: '47%',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardValue: { ...Typography.h3, color: Colors.textPrimary },
  cardLabel: { ...Typography.small, color: Colors.textSecondary },
});
