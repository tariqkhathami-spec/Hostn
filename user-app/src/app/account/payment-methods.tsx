import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '../../services/payments.service';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { PaymentMethod } from '../../types';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: methods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentsService.getSavedMethods(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.deleteMethod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentMethods'] }),
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      t('payment.removeCardTitle'),
      t('payment.removeCardMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('payment.removeCardConfirm'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  const handleAddCard = () => {
    Alert.alert(
      t('payment.addCardSoonTitle'),
      t('payment.addCardSoonBody'),
      [{ text: t('common.ok') }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('account.paymentMethods')}</Text>
        <Pressable onPress={handleAddCard} hitSlop={12} accessibilityLabel={t('payment.addCard')}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : !methods?.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('payment.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('payment.emptyText')}</Text>
          <Pressable style={styles.emptyCta} onPress={handleAddCard}>
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.emptyCtaText}>{t('payment.addCard')}</Text>
          </Pressable>
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
                <Text style={styles.cardExpiry}>
                  {t('payment.expires', { month: item.expiryMonth, year: item.expiryYear })}
                </Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>{t('payment.default')}</Text>
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.md, marginTop: Spacing.md,
  },
  emptyCtaText: { ...Typography.bodyBold, color: Colors.white },
});
