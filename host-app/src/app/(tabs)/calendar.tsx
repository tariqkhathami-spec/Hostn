import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const CARD_GAP = Spacing.sm;
const CARD_PADDING = Spacing.base;
const CARD_WIDTH =
  (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

// ── Mock data ──────────────────────────────────────────────────────────
const MOCK_UNITS = [
  {
    id: '1',
    name: 'شالية ميفارا (1) Mivara',
    bookedDays: [3, 4, 5, 10, 11, 18, 19, 20, 25],
  },
  {
    id: '2',
    name: 'شالية ميفارا (2) Mivara',
    bookedDays: [1, 2, 7, 8, 14, 15, 22, 23, 28, 29],
  },
  {
    id: '3',
    name: 'شالية ميفارا (3) Mivara',
    bookedDays: [5, 6, 12, 13, 19, 20, 26, 27],
  },
  {
    id: '4',
    name: 'شالية ميفارا (4) Mivara',
    bookedDays: [2, 3, 9, 10, 16, 17, 23, 24, 30],
  },
  {
    id: '5',
    name: 'شالية ميفارا (5) Mivara',
    bookedDays: [1, 7, 8, 14, 15, 21, 22, 28],
  },
  {
    id: '6',
    name: 'شالية ميفارا (6) Mivara',
    bookedDays: [4, 5, 11, 12, 18, 19, 25, 26],
  },
  {
    id: '7',
    name: 'شالية ميفارا (7) Mivara',
    bookedDays: [3, 10, 17, 24],
  },
  {
    id: '8',
    name: 'شالية ميفارا (8) Mivara',
    bookedDays: [6, 7, 13, 14, 20, 21, 27, 28],
  },
];

const PROPERTY_NAME = 'شاليهات ميفارا Mivara Resorts';

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
}: {
  year: number;
  month: number;
  bookedDays: number[];
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

  for (let d = 1; d <= totalDays; d++) {
    const isBooked = bookedSet.has(d);
    cells.push(
      <View
        key={d}
        style={[miniStyles.cell, isBooked ? miniStyles.cellBooked : miniStyles.cellEmpty]}
      />,
    );
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
  cellEmpty: {
    backgroundColor: Colors.borderLight,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const now = new Date();
  const [currentMonth] = React.useState(now.getMonth());
  const [currentYear] = React.useState(now.getFullYear());
  const [listedOnly, setListedOnly] = React.useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'\u0627\u0644\u062A\u0642\u0648\u064A\u0645'}</Text>
      </View>

      {/* Toggle row */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {'\u0639\u0631\u0636 \u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0645\u0639\u0631\u0648\u0636\u0629 \u0641\u0642\u0637'}
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
        <Text style={styles.propertyName}>{PROPERTY_NAME}</Text>
      </View>

      {/* Unit grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.unitsGrid}>
          {MOCK_UNITS.map((unit) => (
            <TouchableOpacity
              key={unit.id}
              style={styles.unitCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/property/unit/${unit.id}` as any)}
            >
              <MiniCalendar
                year={currentYear}
                month={currentMonth}
                bookedDays={unit.bookedDays}
              />
              <Text style={styles.unitName} numberOfLines={2}>
                {unit.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
});
