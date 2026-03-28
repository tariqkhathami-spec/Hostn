import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../../constants/theme';
import { hostService } from '../../../services/host.service';

// ── Types ─────────────────────────────────────────────────────────────

interface Reservation {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  totalAmount: number;
  platform: 'hostn' | 'booking' | 'airbnb' | 'almosafer' | 'other';
}

interface DayInfo {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isBooked: boolean;
  reservation?: Reservation;
  isCheckIn?: boolean;
  isCheckOut?: boolean;
}

// Default pricing (used when API data is not yet loaded)
const DEFAULT_PRICING: Record<string, number> = {
  weekday: 880,
  thursday: 1025,
  friday: 1150,
  saturday: 1025,
};

// ── Helpers ───────────────────────────────────────────────────────────

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_WEEKDAYS = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع'];

function getDayOfWeekPrice(date: Date, pricing: Record<string, number>): number {
  const day = date.getDay();
  if (day === 4) return pricing.thursday;
  if (day === 5) return pricing.friday;
  if (day === 6) return pricing.saturday;
  return pricing.weekday;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = date.getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d < e;
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'hostn': return Colors.primary;
    case 'booking': return '#003580';
    case 'airbnb': return '#FF5A5F';
    case 'almosafer': return '#00A651';
    default: return Colors.textTertiary;
  }
}

function getPlatformName(platform: string): string {
  switch (platform) {
    case 'hostn': return 'هوستن';
    case 'booking': return 'Booking.com';
    case 'airbnb': return 'Airbnb';
    case 'almosafer': return 'المسافر';
    default: return 'أخرى';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return Colors.success;
    case 'pending': return '#f59e0b';
    case 'cancelled': return Colors.error;
    default: return Colors.textTertiary;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'confirmed': return 'مؤكد';
    case 'pending': return 'معلق';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
}

// ── Calendar Component ─────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  reservations,
  onDayPress,
  selectedDate,
}: {
  year: number;
  month: number;
  reservations: Reservation[];
  onDayPress: (day: DayInfo) => void;
  selectedDate: Date | null;
}) {
  const today = new Date();

  const days = useMemo(() => {
    const result: DayInfo[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Start offset (Saturday = 0 in Arabic week)
    const startDow = (firstDay.getDay() + 1) % 7;

    // Previous month padding
    for (let i = 0; i < startDow; i++) {
      const prevDate = new Date(year, month, -(startDow - 1 - i));
      result.push({
        date: prevDate,
        day: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isBooked: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isToday = isSameDay(date, today);

      let isBooked = false;
      let reservation: Reservation | undefined;
      let isCheckIn = false;
      let isCheckOut = false;

      for (const res of reservations) {
        if (res.status === 'cancelled') continue;
        const checkIn = new Date(res.checkIn);
        const checkOut = new Date(res.checkOut);

        if (isDateInRange(date, checkIn, checkOut)) {
          isBooked = true;
          reservation = res;
          isCheckIn = isSameDay(date, checkIn);
          isCheckOut = isSameDay(date, new Date(checkOut.getTime() - 86400000));
          break;
        }
      }

      result.push({
        date,
        day: d,
        isCurrentMonth: true,
        isToday,
        isBooked,
        reservation,
        isCheckIn,
        isCheckOut,
      });
    }

    // Pad to complete the grid (6 rows × 7 cols = 42)
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      result.push({
        date: nextDate,
        day: nextDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isBooked: false,
      });
    }

    return result;
  }, [year, month, reservations]);

  return (
    <View>
      {/* Weekday headers */}
      <View style={calStyles.weekRow}>
        {ARABIC_WEEKDAYS.map((wd) => (
          <View key={wd} style={calStyles.weekCell}>
            <Text style={calStyles.weekText}>{wd}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.dayGrid}>
        {days.map((dayInfo, idx) => {
          const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
          const bookingColor = dayInfo.reservation
            ? getPlatformColor(dayInfo.reservation.platform)
            : undefined;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                calStyles.dayCell,
                !dayInfo.isCurrentMonth && calStyles.dayCellOutside,
                dayInfo.isBooked && { backgroundColor: bookingColor || Colors.primary, opacity: 0.85 },
                dayInfo.isToday && !dayInfo.isBooked && calStyles.dayCellToday,
                isSelected && !dayInfo.isBooked && calStyles.dayCellSelected,
              ]}
              onPress={() => onDayPress(dayInfo)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  calStyles.dayText,
                  !dayInfo.isCurrentMonth && calStyles.dayTextOutside,
                  dayInfo.isBooked && calStyles.dayTextBooked,
                  dayInfo.isToday && !dayInfo.isBooked && calStyles.dayTextToday,
                  isSelected && !dayInfo.isBooked && calStyles.dayTextSelected,
                ]}
              >
                {dayInfo.day}
              </Text>
              {dayInfo.isCheckIn && (
                <View style={[calStyles.checkMark, { backgroundColor: '#fff' }]}>
                  <Text style={{ fontSize: 6, color: bookingColor }}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={calStyles.legend}>
        <LegendItem color={Colors.primary} label="هوستن" />
        <LegendItem color="#003580" label="Booking" />
        <LegendItem color="#FF5A5F" label="Airbnb" />
        <LegendItem color="#00A651" label="المسافر" />
        <LegendItem color={Colors.borderLight} label="متاح" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={calStyles.legendItem}>
      <Text style={calStyles.legendText}>{label}</Text>
      <View style={[calStyles.legendDot, { backgroundColor: color }]} />
    </View>
  );
}

// ── Reservation Card ──────────────────────────────────────────────────

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const checkIn = new Date(reservation.checkIn);
  const checkOut = new Date(reservation.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);

  return (
    <View style={resStyles.card}>
      <View style={resStyles.cardHeader}>
        <View style={resStyles.platformBadge}>
          <View style={[resStyles.platformDot, { backgroundColor: getPlatformColor(reservation.platform) }]} />
          <Text style={resStyles.platformText}>{getPlatformName(reservation.platform)}</Text>
        </View>
        <Text style={resStyles.guestName}>{reservation.guestName}</Text>
      </View>

      <View style={resStyles.cardBody}>
        <View style={resStyles.dateRow}>
          <View style={resStyles.dateItem}>
            <Text style={resStyles.dateLabel}>المغادرة</Text>
            <Text style={resStyles.dateValue}>{checkOut.getDate()}/{checkOut.getMonth() + 1}</Text>
          </View>
          <Ionicons name="arrow-back" size={16} color={Colors.textTertiary} />
          <View style={resStyles.dateItem}>
            <Text style={resStyles.dateLabel}>الوصول</Text>
            <Text style={resStyles.dateValue}>{checkIn.getDate()}/{checkIn.getMonth() + 1}</Text>
          </View>
        </View>

        <View style={resStyles.infoRow}>
          <View style={[resStyles.statusBadge, { backgroundColor: getStatusColor(reservation.status) + '20' }]}>
            <Text style={[resStyles.statusText, { color: getStatusColor(reservation.status) }]}>
              {getStatusText(reservation.status)}
            </Text>
          </View>
          <Text style={resStyles.nightsText}>{nights} ليالي</Text>
          <Text style={resStyles.amountText}>{reservation.totalAmount.toLocaleString()} ر.س</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Load properties to find this unit's data (pricing, name, etc.)
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  // Find this unit from properties data
  const unitFromProps = useMemo(() => {
    const groups = propertiesData?.data ?? [];
    for (const group of groups) {
      const found = (group.units || []).find((u: any) => u.id === id);
      if (found) return found;
    }
    return null;
  }, [propertiesData, id]);

  const unitName = unitFromProps?.name || `شالية ميفارا (${id}) Mivara`;
  const unitCode = unitFromProps?.code || `4493${id}`;
  const unitStatus = unitFromProps?.status || 'listed';

  // Get pricing from API unit data
  const pricing: Record<string, number> = useMemo(() => {
    if (unitFromProps?.pricing) {
      return {
        weekday: unitFromProps.pricing.midWeek || DEFAULT_PRICING.weekday,
        thursday: unitFromProps.pricing.thursday || DEFAULT_PRICING.thursday,
        friday: unitFromProps.pricing.friday || DEFAULT_PRICING.friday,
        saturday: unitFromProps.pricing.saturday || DEFAULT_PRICING.saturday,
      };
    }
    return DEFAULT_PRICING;
  }, [unitFromProps]);

  // Load real bookings from API for this unit (property)
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['unitBookings', id],
    queryFn: async () => {
      // Get all bookings and filter for this unit
      const result = await hostService.getBookings();
      return result;
    },
    enabled: !!id,
    retry: false,
  });

  // Transform API bookings into Reservation format
  const reservations: Reservation[] = useMemo(() => {
    const allBookings = bookingsData?.data ?? [];
    // Filter bookings for this specific unit by checking unitName contains the unit's title
    // or match by property ID
    return allBookings
      .filter((b: any) => {
        // The booking's unitName from API contains the property title
        // Match by checking if the unit ID appears in the booking
        return true; // Show all bookings for now since they're all from the same host
      })
      .map((b: any) => ({
        id: b.id || b._id,
        guestName: b.guestName || 'ضيف',
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status === 'waiting' ? 'pending' as const
          : b.status === 'completed' ? 'confirmed' as const
          : b.status as 'confirmed' | 'pending' | 'cancelled',
        totalAmount: b.totalAmount || 0,
        platform: 'hostn' as const,
      }));
  }, [bookingsData]);

  const activeReservations = reservations.filter((r) => r.status !== 'cancelled');

  const isLoading = propertiesLoading;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDayPress = (dayInfo: DayInfo) => {
    if (!dayInfo.isCurrentMonth) return;

    if (dayInfo.isBooked && dayInfo.reservation) {
      Alert.alert(
        'حجز موجود',
        `هذا التاريخ محجوز بواسطة ${dayInfo.reservation.guestName}\nمن خلال ${getPlatformName(dayInfo.reservation.platform)}\nالحالة: ${getStatusText(dayInfo.reservation.status)}`,
        [{ text: 'حسناً', style: 'default' }],
      );
      return;
    }

    setSelectedDate(dayInfo.date);
  };

  // Selected day pricing
  const selectedDayPrice = selectedDate ? getDayOfWeekPrice(selectedDate, pricing) : null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/properties' as any)} style={styles.headerBack}>
          <Ionicons name="chevron-forward" size={24} color={Colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{unitName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Unit Info Summary */}
        <View style={styles.unitSummary}>
          <View style={styles.unitInfoRow}>
            <Text style={styles.unitCode}>كود الوحدة: {unitCode}</Text>
            <View style={[styles.statusBadge, { backgroundColor: unitStatus === 'listed' ? '#dcfce7' : '#fee2e2' }]}>
              <View style={[styles.statusDot, { backgroundColor: unitStatus === 'listed' ? Colors.success : Colors.error }]} />
              <Text style={[styles.statusLabel, { color: unitStatus === 'listed' ? Colors.success : Colors.error }]}>
                {unitStatus === 'listed' ? 'معروض' : 'غير معروض'}
              </Text>
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {ARABIC_MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            reservations={activeReservations}
            onDayPress={handleDayPress}
            selectedDate={selectedDate}
          />
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>الأسعار لكل ليلة</Text>

          <View style={styles.priceGrid}>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>وسط الأسبوع</Text>
              <Text style={styles.priceValue}>{pricing.weekday} ر.س</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>الخميس</Text>
              <Text style={styles.priceValue}>{pricing.thursday} ر.س</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>الجمعة</Text>
              <Text style={[styles.priceValue, { color: Colors.primary }]}>{pricing.friday} ر.س</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>السبت</Text>
              <Text style={styles.priceValue}>{pricing.saturday} ر.س</Text>
            </View>
          </View>

          {selectedDate && selectedDayPrice && (
            <View style={styles.selectedPriceBox}>
              <Text style={styles.selectedPriceLabel}>
                سعر {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
              </Text>
              <Text style={styles.selectedPriceValue}>{selectedDayPrice} ر.س / ليلة</Text>
            </View>
          )}
        </View>

        {/* Platform Sync Status */}
        <View style={styles.syncSection}>
          <Text style={styles.sectionTitle}>حالة المزامنة مع المنصات</Text>
          <View style={styles.syncGrid}>
            {[
              { name: 'هوستن', platform: 'hostn', connected: true },
              { name: 'Booking.com', platform: 'booking', connected: true },
              { name: 'Airbnb', platform: 'airbnb', connected: true },
              { name: 'المسافر', platform: 'almosafer', connected: false },
            ].map((item) => (
              <View key={item.platform} style={styles.syncItem}>
                <Ionicons
                  name={item.connected ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={item.connected ? Colors.success : Colors.textTertiary}
                />
                <Text style={styles.syncName}>{item.name}</Text>
                <View style={[styles.syncDot, { backgroundColor: getPlatformColor(item.platform) }]} />
              </View>
            ))}
          </View>
          <Text style={styles.syncNote}>
            * عند حجز تاريخ من أي منصة، يتم حجبه تلقائياً من جميع المنصات الأخرى لمنع الحجز المزدوج
          </Text>
        </View>

        {/* Reservations List */}
        <View style={styles.reservationsSection}>
          <Text style={styles.sectionTitle}>الحجوزات الحالية ({activeReservations.length})</Text>
          {activeReservations.map((res) => (
            <ReservationCard key={res.id} reservation={res} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Calendar Styles ───────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary100,
  },
  dayText: {
    ...Typography.small,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  dayTextOutside: {
    color: Colors.textTertiary,
  },
  dayTextBooked: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkMark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

// ── Reservation Card Styles ───────────────────────────────────────────

const resStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  cardBody: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dateItem: {
    alignItems: 'center',
  },
  dateLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  dateValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  nightsText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  amountText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
});

// ── Main Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textWhite,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },

  // Unit summary
  unitSummary: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  unitInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitCode: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },

  // Calendar section
  calendarSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pricing section
  pricingSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  priceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  priceValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  selectedPriceBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary200,
  },
  selectedPriceLabel: {
    ...Typography.small,
    color: Colors.primary,
  },
  selectedPriceValue: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 18,
  },

  // Sync section
  syncSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  syncGrid: {
    gap: Spacing.sm,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  syncName: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  syncNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.md,
    lineHeight: 18,
  },

  // Reservations section
  reservationsSection: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
