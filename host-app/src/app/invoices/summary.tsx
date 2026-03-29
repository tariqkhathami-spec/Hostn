import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { AccountSummary, Property } from '../../types';

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

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export default function AccountSummaryScreen() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1).padStart(2, '0'),
  );
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const properties: Property[] = propertiesData?.data ?? [];
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const units = selectedProperty?.units ?? [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accountSummary', selectedMonth, selectedYear, selectedPropertyId, selectedUnitId],
    queryFn: () =>
      hostService.getAccountSummary({
        month: selectedMonth,
        year: selectedYear,
        propertyId: selectedPropertyId,
        unitId: selectedUnitId,
      }),
    retry: false,
  });

  const summary: AccountSummary | undefined = data?.data;

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title="ملخص الحسابات" showBack fallbackRoute="/invoices" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <Card style={styles.filterCard}>
          {/* Month/Year Picker */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowMonthPicker(!showMonthPicker)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText}>
              {ARABIC_MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <Ionicons
              name={showMonthPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showMonthPicker && (
            <View style={styles.pickerGrid}>
              {MONTHS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.monthChip,
                    selectedMonth === m && styles.monthChipActive,
                  ]}
                  onPress={() => {
                    setSelectedMonth(m);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      selectedMonth === m && styles.monthChipTextActive,
                    ]}
                  >
                    {ARABIC_MONTHS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Property Dropdown */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowPropertyPicker(!showPropertyPicker)}
            activeOpacity={0.7}
          >
            <Ionicons name="business-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText}>
              {selectedProperty?.nameAr ?? 'جميع العقارات'}
            </Text>
            <Ionicons
              name={showPropertyPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showPropertyPicker && (
            <View style={styles.pickerList}>
              <TouchableOpacity
                style={[styles.pickerItem, !selectedPropertyId && styles.pickerItemActive]}
                onPress={() => {
                  setSelectedPropertyId(undefined);
                  setSelectedUnitId(undefined);
                  setShowPropertyPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, !selectedPropertyId && styles.pickerItemTextActive]}>
                  جميع العقارات
                </Text>
              </TouchableOpacity>
              {properties.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, selectedPropertyId === p.id && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedPropertyId(p.id);
                    setSelectedUnitId(undefined);
                    setShowPropertyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, selectedPropertyId === p.id && styles.pickerItemTextActive]}>
                    {p.nameAr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Unit Dropdown (only when property selected) */}
          {selectedPropertyId && (
            <>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowUnitPicker(!showUnitPicker)}
                activeOpacity={0.7}
              >
                <Ionicons name="home-outline" size={18} color={Colors.primary} />
                <Text style={styles.filterButtonText}>
                  {units.find((u) => u.id === selectedUnitId)?.name ?? 'جميع الوحدات'}
                </Text>
                <Ionicons
                  name={showUnitPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {showUnitPicker && (
                <View style={styles.pickerList}>
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedUnitId && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedUnitId(undefined);
                      setShowUnitPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, !selectedUnitId && styles.pickerItemTextActive]}>
                      جميع الوحدات
                    </Text>
                  </TouchableOpacity>
                  {units.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.pickerItem, selectedUnitId === u.id && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedUnitId(u.id);
                        setShowUnitPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, selectedUnitId === u.id && styles.pickerItemTextActive]}>
                        {u.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>

        {/* Summary Cards */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xxxl }}
          />
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
              <Text style={styles.retryText}>حاول مرة أخرى</Text>
            </TouchableOpacity>
          </View>
        ) : summary ? (
          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={28} color={Colors.success} />
              <Text style={styles.summaryLabel}>إجمالي الإيرادات</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Ionicons name="calendar-outline" size={28} color={Colors.info} />
              <Text style={styles.summaryLabel}>إجمالي الحجوزات</Text>
              <Text style={styles.summaryValue}>{summary.totalBookings}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Ionicons name="moon-outline" size={28} color={Colors.primary} />
              <Text style={styles.summaryLabel}>متوسط سعر الليلة</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.averageNightRate)}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Ionicons name="stats-chart-outline" size={28} color={Colors.gold} />
              <Text style={styles.summaryLabel}>نسبة الإشغال</Text>
              <Text style={styles.summaryValue}>{summary.occupancyRate.toFixed(1)}%</Text>
            </Card>
          </View>
        ) : null}
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
  filterCard: {
    marginBottom: Spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  filterButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  monthChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthChipText: {
    ...Typography.small,
    color: Colors.textPrimary,
  },
  monthChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  pickerList: {
    paddingVertical: Spacing.sm,
  },
  pickerItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  pickerItemActive: {
    backgroundColor: Colors.primary100,
  },
  pickerItemText: {
    ...Typography.small,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  summaryCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  summaryLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
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
});
