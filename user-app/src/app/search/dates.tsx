import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays } from 'date-fns';
import { useSearchStore } from '../../store/searchStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

export default function DatesScreen() {
  const router = useRouter();
  const { checkIn, checkOut, setDates, city, cityName } = useSearchStore();
  const [startDate, setStartDate] = useState<string | null>(checkIn);
  const [endDate, setEndDate] = useState<string | null>(checkOut);

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleDayPress = (day: DateData) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
    } else {
      if (day.dateString > startDate) {
        setEndDate(day.dateString);
      } else {
        setStartDate(day.dateString);
        setEndDate(null);
      }
    }
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};
    if (startDate) {
      marked[startDate] = {
        startingDay: true,
        color: Colors.primary,
        textColor: Colors.white,
      };
    }
    if (startDate && endDate) {
      marked[endDate] = {
        endingDay: true,
        color: Colors.primary,
        textColor: Colors.white,
      };
      let current = addDays(new Date(startDate), 1);
      const end = new Date(endDate);
      while (current < end) {
        const key = format(current, 'yyyy-MM-dd');
        marked[key] = { color: Colors.primary100, textColor: Colors.primary };
        current = addDays(current, 1);
      }
    }
    return marked;
  };

  const handleSearch = () => {
    if (startDate && endDate) {
      setDates(startDate, endDate);
      router.push({
        pathname: '/results',
        params: { city, cityName },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Select Dates</Text>
        <View style={{ width: 24 }} />
      </View>

      <Calendar
        minDate={today}
        markingType="period"
        markedDates={getMarkedDates()}
        onDayPress={handleDayPress}
        theme={{
          todayTextColor: Colors.primary,
          arrowColor: Colors.primary,
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textMonthFontWeight: '600',
          textDayHeaderFontSize: 12,
        }}
      />

      <View style={styles.dateDisplay}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{startDate ?? 'Select date'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} />
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{endDate ?? 'Select date'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.searchButton, (!startDate || !endDate) && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={!startDate || !endDate}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
          <Text style={styles.searchText}>Search</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  dateBox: { alignItems: 'center', gap: 4 },
  dateLabel: { ...Typography.caption, color: Colors.textSecondary },
  dateValue: { ...Typography.smallBold, color: Colors.textPrimary },
  footer: { flex: 1, justifyContent: 'flex-end', padding: Spacing.xl },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  searchText: { ...Typography.bodyBold, color: Colors.white },
});
