import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export default function BookingConfirmationScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper safeAreaEdges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color={Colors.success} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>تم تأكيد الحجز!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          تم إرسال طلب الحجز بنجاح. ستصلك إشعار التأكيد قريباً.
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="عرض حجوزاتي"
            onPress={() => router.replace('/(tabs)/bookings')}
          />
          <Button
            title="العودة للرئيسية"
            variant="text"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  heading: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxxl,
    maxWidth: 300,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
