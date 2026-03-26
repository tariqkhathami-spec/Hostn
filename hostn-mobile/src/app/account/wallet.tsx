import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { walletService } from '../../services/wallet.service';
import { formatCurrency, formatDate } from '../../utils/format';
import type { WalletTransaction } from '../../types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  refund: 'return-down-back-outline',
  promotional_credit: 'gift-outline',
  booking_charge: 'calendar-outline',
  withdrawal: 'arrow-up-outline',
  cashback: 'cash-outline',
};

const CATEGORY_LABELS: Record<string, string> = {
  refund: 'Refund',
  promotional_credit: 'Promotional Credit',
  booking_charge: 'Booking Charge',
  withdrawal: 'Withdrawal',
  cashback: 'Cashback',
};

export default function WalletScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);

  const {
    data: balance,
    isLoading: balanceLoading,
  } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => walletService.getBalance(),
  });

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions(),
  });

  const transactions = transactionsData?.data ?? [];
  const isLoading = balanceLoading || transactionsLoading;

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isCredit = item.type === 'credit';
    const icon = CATEGORY_ICONS[item.category] ?? 'swap-horizontal-outline';

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, isCredit ? styles.creditIcon : styles.debitIcon]}>
          <Ionicons
            name={icon}
            size={20}
            color={isCredit ? Colors.success : Colors.error}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description || CATEGORY_LABELS[item.category] || item.category}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.createdAt, 'MMM dd, yyyy')}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            isCredit ? styles.creditAmount : styles.debitAmount,
          ]}
        >
          {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <HeaderBar title="Wallet" />
      <View style={styles.container}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <View style={styles.balanceRow}>
            {balanceLoading ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <>
                <Text style={styles.balanceCurrency}>SAR</Text>
                <Text style={styles.balanceAmount}>
                  {balanceVisible
                    ? (balance?.balance ?? 0).toLocaleString('en-SA', {
                        minimumFractionDigits: 2,
                      })
                    : '****'}
                </Text>
              </>
            )}
            <TouchableOpacity
              onPress={() => setBalanceVisible(!balanceVisible)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color={Colors.textWhite}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="wallet-outline"
                title="No transactions"
                subtitle="Your transaction history will appear here"
              />
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceCurrency: {
    ...Typography.body,
    color: Colors.textWhite,
    marginRight: Spacing.sm,
  },
  balanceAmount: {
    ...Typography.h1,
    color: Colors.textWhite,
    flex: 1,
  },
  eyeButton: {
    padding: Spacing.xs,
  },

  // Section
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Transactions
  listContent: {
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  debitIcon: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  transactionDescription: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  transactionDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    ...Typography.bodyBold,
  },
  creditAmount: {
    color: Colors.success,
  },
  debitAmount: {
    color: Colors.error,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
