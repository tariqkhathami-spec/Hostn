import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../components/ui/Toast';

interface Property {
  _id: string;
  title: string;
  images: string[];
  location: { city: string };
  pricing: { basePrice: number };
  isActive: boolean;
}

export default function HostListingsScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const data = await hostService.getMyProperties();
      setProperties(data.properties || data.data || []);
    } catch {
      showToast('Failed to load properties', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, []);

  const handleToggle = async (id: string) => {
    try {
      await hostService.togglePropertyStatus(id);
      fetchProperties();
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const renderProperty = ({ item }: { item: Property }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }}
        style={styles.image}
      />
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.city}>{item.location?.city || '—'}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>{item.pricing?.basePrice?.toLocaleString()} SAR/night</Text>
          <TouchableOpacity onPress={() => handleToggle(item._id)}>
            <View style={[styles.badge, { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={{ color: item.isActive ? '#16a34a' : '#dc2626', fontSize: 12, fontWeight: '600' }}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.heading}>My Listings</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/host/add-listing')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id}
          renderItem={renderProperty}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProperties(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No listings yet</Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: 0 },
  heading: { ...Typography.h2, color: Colors.textPrimary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#059669', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, overflow: 'hidden', ...Shadows.sm },
  image: { width: '100%', height: 160 },
  cardBody: { padding: Spacing.md },
  title: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  city: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  price: { ...Typography.body, fontWeight: '700', color: Colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, gap: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
