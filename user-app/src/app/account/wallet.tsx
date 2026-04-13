import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '../../services/wallet.service';
import { formatCurrency, formatDate } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';

export default function WalletScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const l = (obj: { en: string; ar: string }) => (language === 'ar' ? obj.ar : obj.en);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getBalance(),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: () => walletService.getTransactions(),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{l({ en: 'Wallet', ar: 'المحفظة' })}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{l({ en: 'Available Balance', ar: 'الرصيد المتاح' })}</Text>
        {balanceLoading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.balanceAmount}>
            {formatCurrency(balance?.balance ?? 0, balance?.currency ?? 'SAR')}
          </Text>
        )}
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>{l({ en: 'Transaction History', ar: 'سجل المعاملات' })}</Text>
      {txLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : !transactions?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{l({ en: 'No transactions yet', ar: 'لا توجد معاملات بعد' })}</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: item.type === 'credit' ? Colors.success + '20' : Colors.error + '20' }]}>
                <Ionicons
                  name={item.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={item.type === 'credit' ? Colors.success : Colors.error}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{item.description}</Text>
                <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: item.type === 'credit' ? Colors.success : Colors.error }]}>
                {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
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
  balanceCard: {
    backgroundColor: Colors.primary, margin: Spacing.xl, padding: Spacing.xl,
    borderRadius: Radius.md, alignItems: 'center', gap: Spacing.sm,
  },
  balanceLabel: { ...Typography.small, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { ...Typography.h1, color: Colors.white },
  sectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { ...Typography.small, color: Colors.textPrimary },
  txDate: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { ...Typography.smallBold },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { ...Typography.body, color: Colors.textTertiary },
  loader: { paddingVertical: Spacing.xxl },
});
