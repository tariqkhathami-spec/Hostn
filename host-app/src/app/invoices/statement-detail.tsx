import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/format';
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

export default function StatementDetailScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['statement', month],
    queryFn: () => hostService.getStatementDetail(month!),
    enabled: !!month,
    retry: false,
  });

  const statement: Statement | undefined = data?.data;

  const headerTitle = statement
    ? `${getArabicMonth(statement.month)} ${statement.year}`
    : 'كشف الحساب';

  if (isLoading) {
    return (
      <ScreenWrapper backgroundColor={Colors.primary}>
        <HeaderBar title="كشف الحساب" showBack fallbackRoute="/invoices/statements" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !statement) {
    return (
      <ScreenWrapper backgroundColor={Colors.primary}>
        <HeaderBar title="كشف الحساب" showBack fallbackRoute="/invoices/statements" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>حدث خطأ في تحميل كشف الحساب</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>حاول مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title={headerTitle} showBack fallbackRoute="/invoices/statements" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Card */}
        <Card style={styles.periodCard}>
          <Text style={styles.periodTitle}>الفترة</Text>
          <Text style={styles.periodValue}>
            {getArabicMonth(statement.month)} {statement.year}
          </Text>
        </Card>

        {/* Balance Cards */}
        <View style={styles.balanceCards}>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCardLabel}>رصيد افتتاحي</Text>
            <Text style={styles.balanceCardValue}>
              {formatCurrency(statement.openingBalance)}
            </Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCardLabel}>رصيد ختامي</Text>
            <Text style={styles.balanceCardValue}>
              {formatCurrency(statement.closingBalance)}
            </Text>
          </Card>
        </View>

        {/* Transactions Table */}
        <Card style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>المعاملات</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.cellDate]}>التاريخ</Text>
                <Text style={[styles.tableHeaderCell, styles.cellDesc]}>البيان</Text>
                <Text style={[styles.tableHeaderCell, styles.cellAmount]}>دائن</Text>
                <Text style={[styles.tableHeaderCell, styles.cellAmount]}>مدين</Text>
                <Text style={[styles.tableHeaderCell, styles.cellAmount]}>الرصيد</Text>
              </View>
              {/* Table Rows */}
              {statement.transactions.map((txn, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.cellDate]}>
                    {formatDate(txn.date, 'dd/MM')}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellDesc]} numberOfLines={2}>
                    {txn.description}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellAmount, txn.credit > 0 && styles.creditText]}>
                    {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellAmount, txn.debit > 0 && styles.debitText]}>
                    {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellAmount]}>
                    {formatCurrency(txn.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    ...Typography.smallBold,
    color: Colors.white,
  },
  periodCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  periodTitle: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  periodValue: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
  },
  balanceCards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
  },
  balanceCardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  balanceCardValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  transactionsCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary100,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tableHeaderCell: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tableRowAlt: {
    backgroundColor: Colors.surface,
  },
  tableCell: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cellDate: {
    width: 65,
    textAlign: 'center',
  },
  cellDesc: {
    width: 130,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cellAmount: {
    width: 85,
    textAlign: 'center',
  },
  creditText: {
    color: Colors.success,
  },
  debitText: {
    color: Colors.error,
  },
});
