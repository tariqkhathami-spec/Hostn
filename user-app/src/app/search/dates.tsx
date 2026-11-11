import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings.service';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays } from 'date-fns';
import { useSearchStore } from '../../store/searchStore';
import { useLanguage } from '../../i18n';
import { setCalendarLocale } from '../../i18n/calendarLocale';
import { Colors, Typography, Spacing, Radius, BACK_ICON, FORWARD_ICON } from '../../constants/theme';

export default function DatesScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  // returnTo='checkout' means this screen was opened from the checkout
  // edit-dates flow (R19 workaround). On Search press we save the dates
  // and router.back() instead of pushing to /results.
  const { returnTo, listingId } = useLocalSearchParams<{ returnTo?: string; listingId?: string }>();
  const { checkIn, checkOut, setDates, city, cityName } = useSearchStore();
  const [startDate, setStartDate] = useState<string | null>(checkIn);
  const [endDate, setEndDate] = useState<string | null>(checkOut);

  setCalendarLocale(language);

  const today = format(new Date(), 'yyyy-MM-dd');

  // When picking dates for one listing, show which nights are already taken
  // so the guest does not choose them and get refused at the last step.
  const { data: bookedRanges } = useQuery({
    queryKey: ['bookedDates', listingId],
    queryFn: () => bookingsService.getUnitBookedDates(listingId!),
    enabled: !!listingId,
    staleTime: 0,
  });
  const bookedNights = useMemo(() => {
    const nights = new Set<string>();
    const ranges: any[] = Array.isArray(bookedRanges) ? bookedRanges : (bookedRanges as any)?.data ?? [];
    for (const range of ranges) {
      if (!range?.checkIn || !range?.checkOut) continue;
      let day = new Date(String(range.checkIn).slice(0, 10));
      const end = new Date(String(range.checkOut).slice(0, 10));
      // The check-out day itself is free for the next guest to arrive.
      for (let i = 0; day < end && i < 400; i += 1) {
        const key = format(day, 'yyyy-MM-dd');
        if (key >= today) nights.add(key); // past nights are disabled anyway
        day = addDays(day, 1);
      }
    }
    return nights;
  }, [bookedRanges, today]);
  const isAr = language === 'ar';

  const handleDayPress = (day: DateData) => {
    // A booked night can still be a check-out day, never a check-in day.
    const choosingStart = !startDate || (startDate && endDate) || day.dateString <= (startDate ?? '');
    if (choosingStart && bookedNights.has(day.dateString)) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
    } else {
      if (day.dateString > startDate) {
        // A stay cannot run across nights that are already booked.
        let cursor = new Date(startDate);
        const last = new Date(day.dateString);
        let crossesBooked = false;
        while (cursor < last) {
          if (bookedNights.has(format(cursor, 'yyyy-MM-dd'))) { crossesBooked = true; break; }
          cursor = addDays(cursor, 1);
        }
        if (crossesBooked) {
          Alert.alert(
            isAr ? 'تواريخ غير متاحة' : 'Dates not available',
            isAr ? 'بين التاريخين أيام محجوزة. اختر فترة أخرى.' : 'Some nights in this range are already booked. Choose another range.',
          );
          setStartDate(null);
          setEndDate(null);
          return;
        }
        setEndDate(day.dateString);
      } else {
        setStartDate(day.dateString);
        setEndDate(null);
      }
    }
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};
    bookedNights.forEach((night) => {
      marked[night] = { disabled: true, color: '#f1f1f4', textColor: '#b8b8c2' };
    });
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
    if (!startDate || !endDate) return;
    setDates(startDate, endDate);
    if (returnTo === 'checkout') {
      router.back();
      return;
    }
    router.push({
      pathname: '/results',
      params: { city, cityName },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('search.selectDates')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Calendar
        key={language}
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

      {bookedNights.size > 0 ? (
        <Text style={{ textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.sm }}>
          {isAr ? 'الأيام المظللة بالرمادي محجوزة' : 'Greyed-out days are already booked'}
        </Text>
      ) : null}

      <View style={styles.dateDisplay}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>{t('search.checkIn')}</Text>
          <Text style={styles.dateValue}>{startDate ?? t('search.selectDate')}</Text>
        </View>
        <Ionicons name={FORWARD_ICON} size={20} color={Colors.textTertiary} />
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>{t('search.checkOut')}</Text>
          <Text style={styles.dateValue}>{endDate ?? t('search.selectDate')}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.searchButton, (!startDate || !endDate) && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={!startDate || !endDate}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
          <Text style={styles.searchText}>{t('search.search')}</Text>
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
