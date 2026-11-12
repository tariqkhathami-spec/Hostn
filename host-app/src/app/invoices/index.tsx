import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { Colors, Spacing, Typography, Radius, TEXT_START, DirectionalIcon } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Invoice } from '../../types';

export default function InvoicesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // The API returns 20 invoices per page: older ones load on demand.
  const { data, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['invoices', 'list'],
    queryFn: ({ pageParam }) => hostService.getInvoices({ page: pageParam }),
    initialPageParam: 1,
    // The API answers with pagination.pages; stop when the last page is loaded.
    getNextPageParam: (last: any, _all: unknown[], lastPage: number) =>
      lastPage < Number(last?.pagination?.pages ?? 1) ? lastPage + 1 : undefined,
    retry: false,
  });

  const invoices: Invoice[] = (data?.pages ?? []).flatMap((p: any) => p?.data ?? []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderInvoice = useCallback(
    ({ item }: { item: Invoice }) => (
      <Card
        onPress={() => router.push(`/invoices/${item.id}` as any)}
        style={styles.invoiceCard}
      >
        <View style={styles.invoiceRow}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.invoiceRight}>
            <Text style={styles.invoiceAmount}>{formatCurrency(item.amount)}</Text>
            <Ionicons name={DirectionalIcon.forward} size={20} color={Colors.textTertiary} />
          </View>
        </View>
      </Card>
    ),
    [router],
  );

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title="الفواتير" showBack />

      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xxxl }}
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            message="لا توجد فواتير"
          />
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(item) => item.id}
            renderItem={renderInvoice}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={
              hasNextPage ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  activeOpacity={0.7}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>عرض المزيد</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    minWidth: 140,
    alignItems: 'center',
  },
  loadMoreText: {
    ...Typography.smallBold,
    color: Colors.primary,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.base,
  },
  separator: {
    height: Spacing.sm,
  },
  invoiceCard: {
    marginBottom: 0,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    writingDirection: 'rtl',
  },
  invoiceDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
    marginTop: Spacing.xs,
  },
  invoiceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  invoiceAmount: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
});
