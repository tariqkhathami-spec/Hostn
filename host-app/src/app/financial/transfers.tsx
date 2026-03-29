import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import { hostService } from '../../services/host.service';
import { formatCurrency, formatDate } from '../../utils/format';
import type { Transfer } from '../../types';

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

const statusBgColors: Record<Transfer['status'], string> = {
  completed: '#dcfce7',
  pending: '#fef3c7',
  failed: '#fecaca',
};

export default function TransfersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['transfers', search],
    queryFn: () => hostService.getTransfers({ search: search || undefined }),
    retry: false,
  });

  const transfers: Transfer[] = data?.data || [];

  const handlePress = useCallback((transfer: Transfer) => {
    router.push(`/financial/${transfer.id}` as any);
  }, [router]);

  const renderTransfer = useCallback(({ item }: { item: Transfer }) => {
    const statusColor = statusColors[item.status];
    const statusBg = statusBgColors[item.status];

    return (
      <TouchableOpacity
        style={styles.transferCard}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
          <Text style={styles.transactionId}>{item.transactionId}</Text>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.date}>{formatDate(item.requestDate)}</Text>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handlePress]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        </View>
      );
    }

    if (transfers.length === 0) {
      return (
        <EmptyState
          icon="swap-horizontal-outline"
          message="لا توجد حوالات"
          submessage="لم يتم العثور على حوالات بنكية"
        />
      );
    }

    return (
      <FlatList
        data={transfers}
        renderItem={renderTransfer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />
    );
  };

  return (
    <ScreenWrapper>
      <HeaderBar title="الحوالات البنكية" showBack fallbackRoute="/financial" />
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث برقم الحوالة..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  transferCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  transactionId: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  date: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
