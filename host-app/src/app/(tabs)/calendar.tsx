import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { CalendarProperty, CalendarUnit } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const CARD_GAP = Spacing.sm;
const CARD_PADDING = Spacing.base;
const CARD_WIDTH =
  (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

// ── Helpers ────────────────────────────────────────────────────────────

/** Return the number of days in a given month (0-indexed). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ── Mini Calendar (thumbnail per unit) ─────────────────────────────────

function MiniCalendar({
  year,
  month,
  bookedDays,
  blockedDays,
  onDayPress,
}: {
  year: number;
  month: number;
  bookedDays: number[];
  blockedDays?: number[];
  onDayPress?: (day: number, isBlocked: boolean) => void;
}) {
  const totalDays = daysInMonth(year, month);
  // 7 columns (Sat-Fri in Arabic calendar)
  const COLS = 7;
  // Day of week the month starts on (0=Sun … 6=Sat)
  const startDay = new Date(year, month, 1).getDay();
  // Shift so Saturday=0 for Arabic week
  const offset = (startDay + 1) % 7;

  const cells: React.ReactNode[] = [];

  // Empty offset cells
  for (let i = 0; i < offset; i++) {
    cells.push(<View key={`e-${i}`} style={miniStyles.cell} />);
  }

  const bookedSet = new Set(bookedDays);
  const blockedSet = new Set(blockedDays ?? []);

  for (let d = 1; d <= totalDays; d++) {
    const isBooked = bookedSet.has(d);
    const isBlocked = blockedSet.has(d);
    const cellStyle = isBooked
      ? miniStyles.cellBooked
      : isBlocked
        ? miniStyles.cellBlocked
        : miniStyles.cellEmpty;

    if (onDayPress && !isBooked) {
      cells.push(
        <TouchableOpacity
          key={d}
          style={[miniStyles.cell, cellStyle]}
          onPress={() => onDayPress(d, isBlocked)}
          activeOpacity={0.6}
        />,
      );
    } else {
      cells.push(
        <View key={d} style={[miniStyles.cell, cellStyle]} />,
      );
    }
  }

  // Pad to fill last row
  const remainder = cells.length % COLS;
  if (remainder !== 0) {
    for (let i = 0; i < COLS - remainder; i++) {
      cells.push(<View key={`p-${i}`} style={miniStyles.cell} />);
    }
  }

  return (
    <View style={miniStyles.grid}>
      {cells.map((cell, idx) => (
        <React.Fragment key={idx}>{cell}</React.Fragment>
      ))}
    </View>
  );
}

const MINI_CELL_SIZE = Math.floor((CARD_WIDTH - Spacing.sm * 2) / 7) - 1;

const miniStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: 1,
  },
  cellBooked: {
    backgroundColor: Colors.primary,
  },
  cellBlocked: {
    backgroundColor: Colors.error,
  },
  cellEmpty: {
    backgroundColor: Colors.borderLight,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = new Date();
  const [currentMonth] = React.useState(now.getMonth());
  const [currentYear] = React.useState(now.getFullYear());
  const [listedOnly, setListedOnly] = React.useState(false);

  // Fetch real calendar data from API
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['hostCalendar', currentYear, currentMonth],
    queryFn: () => hostService.getCalendarData(currentYear, currentMonth),
    retry: false,
  });

  const blockMutation = useMutation({
    mutationFn: ({ propertyId, date, block }: { propertyId: string; date: string; block: boolean }) => {
      const dates = { start: date, end: date };
      return block
        ? hostService.blockDates(propertyId, dates)
        : hostService.unblockDates(propertyId, dates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostCalendar'] });
    },
    onError: () => {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث التقويم');
    },
  });

  const handleDayPress = React.useCallback(
    (unitId: string, propertyId: string, day: number, isBlocked: boolean) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const actionLabel = isBlocked ? 'إلغاء الحظر' : 'حظر التاريخ';
      const message = isBlocked
        ? `هل تريد إلغاء حظر يوم ${day}؟`
        : `هل تريد حظر يوم ${day}؟`;
      Alert.alert(actionLabel, message, [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: actionLabel,
          onPress: () => blockMutation.mutate({ propertyId, date: dateStr, block: !isBlocked }),
        },
      ]);
    },
    [currentYear, currentMonth, blockMutation],
  );

  // Transform API data into display units
  const calendarGroups: CalendarProperty[] = calendarData?.data ?? [];

  // Flatten all units from all property groups
  const allUnits: (CalendarUnit & { propertyName: string })[] = [];
  calendarGroups.forEach((group) => {
    (group.units || []).forEach((unit) => {
      allUnits.push({ ...unit, propertyName: group.propertyName });
    });
  });

  // Filter by listed-only toggle
  const displayUnits = listedOnly ? allUnits.filter((u) => u.isListed) : allUnits;

  // Convert ISO date strings (e.g. "2026-03-19") to day numbers for the mini calendar
  const getBookedDays = (bookedDates: string[]): number[] => {
    return (bookedDates || [])
      .map((d) => {
        const date = new Date(d);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          return date.getDate();
        }
        return -1;
      })
      .filter((d) => d > 0);
  };

  const propertyName = calendarGroups.length > 0
    ? calendarGroups[0].propertyName
    : 'جاري التحميل...';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'التقويم'}</Text>
      </View>

      {/* Toggle row */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {'عرض الوحدات المعروضة فقط'}
        </Text>
        <Switch
          value={listedOnly}
          onValueChange={setListedOnly}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={listedOnly ? Colors.primary : Colors.white}
        />
      </View>

      {/* Property name */}
      <View style={styles.propertyRow}>
        <Text style={styles.propertyName}>{propertyName}</Text>
      </View>

      {/* Block hint */}
      <View style={styles.hintRow}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
        <Text style={styles.hintText}>{'اضغط على التاريخ لحظره'}</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>{'محجوز'}</Text>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>{'محظور'}</Text>
        </View>
      </View>

      {/* Unit grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل التقويم...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.unitsGrid}>
            {displayUnits.map((unit) => {
              // Find the property this unit belongs to
              const parentProperty = calendarGroups.find((g) =>
                (g.units || []).some((u) => u.unitId === unit.unitId),
              );
              const propertyId = parentProperty?.propertyId ?? '';
              const blockedDays = getBookedDays(unit.blockedDates ?? []);

              return (
                <View key={unit.unitId} style={styles.unitCard}>
                  <MiniCalendar
                    year={currentYear}
                    month={currentMonth}
                    bookedDays={getBookedDays(unit.bookedDates)}
                    blockedDays={blockedDays}
                    onDayPress={(day, isBlocked) =>
                      handleDayPress(unit.unitId, propertyId, day, isBlocked)
                    }
                  />
                  <Text style={styles.unitName} numberOfLines={2}>
                    {unit.unitName}
                  </Text>
                </View>
              );
            })}
          </View>

          {displayUnits.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد وحدات</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toggleLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  propertyRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'center',
  },
  propertyName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  hintText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
    textAlign: 'right',
  },
  legendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  legendText: {
    ...Typography.tiny,
    color: Colors.textTertiary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: CARD_PADDING,
    paddingBottom: 100,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  unitCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: CARD_GAP,
    ...Shadows.sm,
    alignItems: 'center',
  },
  unitName: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
});
