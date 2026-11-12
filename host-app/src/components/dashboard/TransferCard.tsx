import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transfer } from '../../types';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/format';

interface TransferCardProps {
  transfer: Transfer;
  onPress?: () => void;
}

const statusColors: Record<Transfer['status'], string> = {
  completed: Colors.success,
  pending: Colors.warning,
  failed: Colors.error,
};

const statusLabels: Record<Transfer['status'], string> = {
  completed: 'مكتمل',
  pending: 'قيد المعالجة',
  failed: 'فشل',
};

export default function TransferCard({ transfer, onPress }: TransferCardProps) {
  const statusColor = statusColors[transfer.status];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.transactionId}>{transfer.transactionId}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabels[transfer.status]}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.amount}>{formatCurrency(transfer.amount)}</Text>
        <Text style={styles.date}>{formatDate(transfer.requestDate)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  transactionId: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  date: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
