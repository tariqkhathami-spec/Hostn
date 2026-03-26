import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CalendarList, DateData } from 'react-native-calendars';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { useSearchStore } from '../../store/searchStore';
import { formatDate } from '../../utils/format';

function getDateRange(
  start: string,
  end: string,
): Record<string, { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean }> {
  const marks: Record<
    string,
    { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean }
  > = {};

  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const isStart = dateStr === start;
    const isEnd = dateStr === end;

    marks[dateStr] = {
      color: isStart || isEnd ? Colors.primary : Colors.primaryLight + '33',
      textColor: isStart || isEnd ? Colors.textWhite : Colors.primary,
      startingDay: isStart,
      endingDay: isEnd,
    };

    current.setDate(current.getDate() + 1);
  }

  return marks;
}

export default function DatesScreen() {
  const router = useRouter();
  const { dates: storedDates, setDates } = useSearchStore();

  const [checkIn, setCheckIn] = useState<string | null>(storedDates.checkIn);
  const [checkOut, setCheckOut] = useState<string | null>(storedDates.checkOut);

  const today = new Date().toISOString().split('T')[0];

  const markedDates = useMemo(() => {
    if (checkIn && checkOut) {
      return getDateRange(checkIn, checkOut);
    }
    if (checkIn) {
      return {
        [checkIn]: {
          color: Colors.primary,
          textColor: Colors.textWhite,
          startingDay: true,
          endingDay: true,
        },
      };
    }
    return {};
  }, [checkIn, checkOut]);

  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut(null);
    } else {
      if (dateStr < checkIn) {
        setCheckIn(dateStr);
        setCheckOut(null);
      } else if (dateStr === checkIn) {
        setCheckIn(null);
        setCheckOut(null);
      } else {
        setCheckOut(dateStr);
      }
    }
  };

  const handleSearch = () => {
    setDates({ checkIn, checkOut });
    router.push('/results/');
  };

  const canSearch = !!checkIn && !!checkOut;

  return (
    <ScreenWrapper>
      <HeaderBar title="Select Dates" />

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Check-in</Text>
          <Text style={styles.summaryValue}>
            {checkIn ? formatDate(checkIn, 'MMM dd, yyyy') : 'Select date'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Check-out</Text>
          <Text style={styles.summaryValue}>
            {checkOut ? formatDate(checkOut, 'MMM dd, yyyy') : 'Select date'}
          </Text>
        </View>
      </View>

      {/* Calendar */}
      <CalendarList
        markingType="period"
        minDate={today}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        pastScrollRange={0}
        futureScrollRange={12}
        scrollEnabled
        showScrollIndicator={false}
        theme={{
          calendarBackground: Colors.background,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.primary,
          selectedDayTextColor: Colors.textWhite,
          todayTextColor: Colors.primary,
          dayTextColor: Colors.textPrimary,
          textDisabledColor: Colors.textLight,
          monthTextColor: Colors.textPrimary,
          textMonthFontWeight: '700',
          textMonthFontSize: 18,
          textDayFontSize: 16,
          textDayHeaderFontSize: 14,
          'stylesheet.calendar.header': {
            dayTextAtIndex0: { color: Colors.textSecondary },
            dayTextAtIndex6: { color: Colors.textSecondary },
          },
        }}
      />

      {/* Search Button */}
      <View style={[styles.bottomBar, Shadows.bottomBar]}>
        <TouchableOpacity
          style={[
            styles.searchButton,
            !canSearch && styles.searchButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={!canSearch}
        >
          <Ionicons name="search" size={20} color={Colors.textWhite} />
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
