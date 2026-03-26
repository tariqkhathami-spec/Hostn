import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../components/ui/Toast';
import api from '../../services/api';

interface Booking {
  _id: string;
  guest?: { name: string };
  property?: { title: string };
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#a16207' },
  confirmed: { bg: '#dcfce7', text: '#16a34a' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  completed: { bg: '#dbeafe', text: '#2563eb' },
};

export default function HostBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings/host-bookings');
      setBookings(data.bookings || data.data || []);
    } catch {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, []);

  const handleAction = async (id: string, status: string) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      showToast(`Booking ${status}`, 'success');
      fetchBookings();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const colors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.guestName}>{item.guest?.name || 'Guest'}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.property}>{item.property?.title || '—'}</Text>
        <Text style={styles.dates}>
          {new Date(item.checkIn).toLocaleDateString()} → {new Date(item.checkOut).toLocaleDateString()}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{item.totalPrice?.toLocaleString()} SAR</Text>
          {item.status === 'pending' && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAction(item._id, 'confirmed')}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleAction(item._id, 'cancelled')}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <Text style={styles.heading}>Bookings</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { ...Typography.h2, color: Colors.textPrimary, padding: Spacing.lg, paddingBottom: 0 },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guestName: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  property: { ...Typography.small, color: Colors.textSecondary },
  dates: { ...Typography.small, color: Colors.textSecondary, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  price: { ...Typography.body, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  acceptBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.md },
  acceptText: { color: '#16a34a', fontWeight: '600', fontSize: 13 },
  declineBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.md },
  declineText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, gap: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
