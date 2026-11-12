import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { t } from '../../utils/i18n';
import type { CalendarProperty, CalendarUnit } from '../../types';

// ---------------------------------------------------------------------------
// S1 — Multi-property calendar root (Phase 8 MVP, Task 8.2).
//
// Per gathern_calendar_feature_spec.md §S1: a sectioned overview of every
// property the host owns, with each section's bookable units rendered as
// mini-month tiles for the *current* month. Tapping a tile drills into that
// unit's full month view (Task 8.3 — S2). No legend, no per-day onPress, no
// month nav at this level — those belong to S2.
//
// Pre-fix this screen was a flat 3-column unit grid that read
// `calendarGroups[0].propertyName` as the page header (an M16-class
// single-property assumption) and bound a block-on-tap day handler at the
// mini-tile level (which belongs in S3, not S1). Rewritten to match the
// competitor's information architecture.
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const SECTION_PADDING = Spacing.base;
const TILE_GAP = Spacing.sm;
const TILE_WIDTH =
  (SCREEN_WIDTH - SECTION_PADDING * 2 - TILE_GAP * (GRID_COLUMNS - 1)) /
  GRID_COLUMNS;
const MINI_CELL_SIZE = Math.floor((TILE_WIDTH - Spacing.sm * 2) / 7) - 1;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Map ISO date strings ("2026-05-13") for the active month to day numbers. */
function isoToDayNumbersForMonth(
  isoDates: string[],
  year: number,
  month: number,
): number[] {
  const out: number[] = [];
  for (const iso of isoDates) {
    const d = new Date(iso);
    if (d.getFullYear() === year && d.getMonth() === month) out.push(d.getDate());
  }
  return out;
}

// ---------------------------------------------------------------------------
// MiniMonth — read-only thumbnail per unit. Cell colour rules:
//   - today          → solid purple, white text
//   - past           → pale grey
//   - booked         → solid purple square
//   - blocked        → red square
//   - other future   → light outline
//
// No onPress at the cell level (S1 isn't where day-edits happen). The whole
// tile is wrapped in a Pressable in the parent.
// ---------------------------------------------------------------------------

function MiniMonth({
  year,
  month,
  bookedDays,
  blockedDays,
}: {
  year: number;
  month: number;
  bookedDays: number[];
  blockedDays: number[];
}) {
  const totalDays = daysInMonth(year, month);
  const startDay = new Date(year, month, 1).getDay();
  const offset = (startDay + 1) % 7; // Saturday-first week

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const bookedSet = new Set(bookedDays);
  const blockedSet = new Set(blockedDays);

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < offset; i++) {
    cells.push(<View key={`e-${i}`} style={miniStyles.cellEmpty} />);
  }

  for (let d = 1; d <= totalDays; d++) {
    const isToday = d === todayDay;
    const isPast = isCurrentMonth && d < todayDay;
    const isBooked = bookedSet.has(d);
    const isBlocked = blockedSet.has(d);

    const style = isToday
      ? miniStyles.cellToday
      : isBlocked
        ? miniStyles.cellBlocked
        : isBooked
          ? miniStyles.cellBooked
          : isPast
            ? miniStyles.cellPast
            : miniStyles.cellFuture;

    cells.push(<View key={d} style={style} />);
  }

  // pad to full last row so the grid keeps its 7-col rhythm
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push(<View key={`p-${i}`} style={miniStyles.cellEmpty} />);
    }
  }

  return <View style={miniStyles.grid}>{cells}</View>;
}

const miniStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cellEmpty: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
  },
  cellFuture: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: 1,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  cellPast: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: 1,
    backgroundColor: Colors.surfaceAlt,
  },
  cellBooked: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  cellBlocked: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: 1,
    backgroundColor: Colors.error,
  },
  cellToday: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    margin: 0.5,
    borderRadius: MINI_CELL_SIZE / 2,
    backgroundColor: Colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CalendarScreen() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  const [listedOnly, setListedOnly] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['hostCalendar', year, month],
    queryFn: () => hostService.getCalendarData(year, month),
    retry: false,
  });

  const properties: CalendarProperty[] = (data as any)?.data ?? [];

  // Apply listed-only filter at the unit level. Properties whose units all
  // fail the filter are dropped entirely so the section header doesn't
  // dangle empty.
  const visibleProperties: CalendarProperty[] = useMemo(() => {
    if (!listedOnly) return properties;
    return properties
      .map((p) => ({ ...p, units: (p.units || []).filter((u) => u.isListed) }))
      .filter((p) => p.units.length > 0);
  }, [properties, listedOnly]);

  const handleUnitPress = (unitId: string) => {
    router.push(`/property/unit/${unitId}` as any);
  };

  // -------------------------------------------------------------------------
  // Render branches. Order: loading > empty (filter-aware) > sections.
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('calendar.listedOnly')}</Text>
        <Switch
          value={listedOnly}
          onValueChange={setListedOnly}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={listedOnly ? Colors.primary : Colors.white}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : visibleProperties.length === 0 ? (
        // Two distinct empty states:
        //   - filter ON, none listed → blank below the toggle (per spec)
        //   - filter OFF, no properties at all → empty-state copy
        listedOnly ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.centered}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>{t('calendar.empty')}</Text>
            <Text style={styles.emptyHint}>{t('calendar.emptyHint')}</Text>
          </View>
        )
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
        >
          {visibleProperties.map((property) => (
            <PropertySection
              key={property.propertyId}
              property={property}
              year={year}
              month={month}
              onUnitPress={handleUnitPress}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PropertySection — one bold header followed by a 3-col grid of unit tiles.
// ---------------------------------------------------------------------------

function PropertySection({
  property,
  year,
  month,
  onUnitPress,
}: {
  property: CalendarProperty;
  year: number;
  month: number;
  onUnitPress: (unitId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{property.propertyName}</Text>
      <View style={styles.tileGrid}>
        {property.units.map((unit) => (
          <UnitTile
            key={unit.unitId}
            unit={unit}
            year={year}
            month={month}
            onPress={() => onUnitPress(unit.unitId)}
          />
        ))}
      </View>
    </View>
  );
}

function UnitTile({
  unit,
  year,
  month,
  onPress,
}: {
  unit: CalendarUnit;
  year: number;
  month: number;
  onPress: () => void;
}) {
  const bookedDays = isoToDayNumbersForMonth(unit.bookedDates ?? [], year, month);
  const blockedDays = isoToDayNumbersForMonth(unit.blockedDates ?? [], year, month);
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MiniMonth
        year={year}
        month={month}
        bookedDays={bookedDays}
        blockedDays={blockedDays}
      />
      {/* Hostn-specific deviation from Gathern: we show the unit name under
          the tile. Gathern shows nothing, forcing trial-and-click discovery.
          A label is strictly better UX. */}
      <Text style={styles.tileLabel} numberOfLines={2}>
        {unit.unitName}
      </Text>
      {!unit.isListed && (
        <Text style={styles.tileUnlisted}>{t('properties.unlisted')}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SECTION_PADDING,
    paddingBottom: Spacing.xxxl + 40,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.sm,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  tileLabel: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  tileUnlisted: {
    ...Typography.tiny,
    color: Colors.error,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  emptyHint: {
    ...Typography.small,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
