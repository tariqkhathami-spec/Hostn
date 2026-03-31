import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '../../services/payments.service';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import type { PaymentMethod } from '../../types';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: methods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentsService.getSavedMethods(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.deleteMethod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentMethods'] }),
  });

  const handleDelete = (id: string) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this card?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : !methods?.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No saved cards</Text>
          <Text style={styles.emptyText}>Add a card to speed up your checkout</Text>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: PaymentMethod }) => (
            <View style={styles.cardRow}>
              <Ionicons name="card" size={28} color={Colors.primary} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardBrand}>{item.brand} •••• {item.last4}</Text>
                <Text style={styles.cardExpiry}>Expires {item.expiryMonth}/{item.expiryYear}</Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
              <Pressable onPress={() => handleDelete(item._id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: Spacing.xl, gap: Spacing.md },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, padding: Spacing.base, borderRadius: Radius.md, ...Shadows.card,
  },
  cardInfo: { flex: 1 },
  cardBrand: { ...Typography.bodyBold, color: Colors.textPrimary },
  cardExpiry: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  defaultBadge: { backgroundColor: Colors.success + '20', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.xs },
  defaultText: { ...Typography.tiny, color: Colors.success, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
