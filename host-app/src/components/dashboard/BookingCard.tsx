import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/format';

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
}

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.topRow}>
        <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
        <StatusBadge status={booking.status} />
      </View>

      <Text style={styles.guestName}>{booking.guestName}</Text>

      <View style={styles.datesRow}>
        <Text style={styles.dates}>
          {formatDate(booking.checkIn, 'dd/MM')} - {formatDate(booking.checkOut, 'dd/MM')}
        </Text>
        <Text style={styles.amount}>{formatCurrency(booking.totalAmount)}</Text>
      </View>

      <Text style={styles.unitName}>{booking.unitName}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bookingNumber: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.xs,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dates: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  amount: {
    ...Typography.smallBold,
    color: Colors.success,
  },
  unitName: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
  },
});
