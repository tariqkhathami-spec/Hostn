import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

type Status = 'pending' | 'confirmed' | 'in_payment' | 'waiting' | 'cancelled' | 'no_show' | 'completed' | 'rejected' | 'held';

const statusConfig: Record<Status, { bg: string; text: string; label: string; labelAr: string }> = {
  pending: { bg: '#fef3c7', text: Colors.statusWaiting, label: 'Pending', labelAr: 'بانتظار القبول' },
  confirmed: { bg: '#dcfce7', text: Colors.statusConfirmed, label: 'Confirmed', labelAr: 'مؤكد' },
  in_payment: { bg: '#dbeafe', text: Colors.statusPayment, label: 'In Payment', labelAr: 'جاري السداد' },
  waiting: { bg: '#fef3c7', text: Colors.statusWaiting, label: 'Waiting', labelAr: 'منتظي' },
  cancelled: { bg: '#fecaca', text: Colors.statusCancelled, label: 'Cancelled', labelAr: 'ملغي' },
  rejected: { bg: '#fecaca', text: Colors.statusCancelled, label: 'Rejected', labelAr: 'مرفوض' },
  no_show: { bg: '#f3f4f6', text: Colors.statusNoShow, label: 'No Show', labelAr: 'عدم حضور' },
  completed: { bg: '#dcfce7', text: Colors.statusConfirmed, label: 'Completed', labelAr: 'مكتمل' },
  held: { bg: '#ede9fe', text: '#7c3aed', label: 'Held', labelAr: 'محجوز مؤقتاً' },
};

interface Props {
  status: Status;
  locale?: 'ar' | 'en';
}

export default function StatusBadge({ status, locale = 'ar' }: Props) {
  const config = statusConfig[status] || statusConfig.waiting;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.text, { color: config.text }]}>
        {locale === 'ar' ? config.labelAr : config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
