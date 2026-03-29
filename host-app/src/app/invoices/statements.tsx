import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Statement } from '../../types';

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

function getArabicMonth(month: string): string {
  return ARABIC_MONTHS[month] ?? month;
}

export default function StatementsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['statements'],
    queryFn: () => hostService.getStatements(),
    retry: false,
  });

  const statements: Statement[] = data?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderStatement = useCallback(
    ({ item }: { item: Statement }) => (
      <Card
        onPress={() => router.push(`/invoices/statement-detail?month=${item.month}` as any)}
        style={styles.statementCard}
      >
        <View style={styles.statementRow}>
          <View style={styles.statementInfo}>
            <Text style={styles.statementMonth}>
              {getArabicMonth(item.month)} {item.year}
            </Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>رصيد افتتاحي: </Text>
              <Text style={styles.balanceValue}>{formatCurrency(item.openingBalance)}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>رصيد ختامي: </Text>
              <Text style={styles.balanceValue}>{formatCurrency(item.closingBalance)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
        </View>
      </Card>
    ),
    [router],
  );

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title="كشوف الحسابات" showBack fallbackRoute="/invoices" />

      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xxxl }}
          />
        ) : statements.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            message="لا توجد كشوف حسابات"
          />
        ) : (
          <FlatList
            data={statements}
            keyExtractor={(item) => item.id}
            renderItem={renderStatement}
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
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  statementCard: {
    marginBottom: 0,
  },
  statementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statementInfo: {
    flex: 1,
  },
  statementMonth: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  balanceValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
