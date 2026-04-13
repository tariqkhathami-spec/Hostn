import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentsService, bnplService } from '../../services/payments.service';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';

type PaymentStatus = 'loading' | 'success' | 'failure';

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const { paymentId, status, provider } = useLocalSearchParams<{
    paymentId: string;
    status: string;
    provider: string;
  }>();

  const { t } = useLanguage();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    verifyPayment();
  }, []);

  async function verifyPayment() {
    if (!paymentId || !provider) {
      setErrorMessage('Missing payment information.');
      setPaymentStatus('failure');
      return;
    }

    try {
      switch (provider) {
        case 'moyasar':
          await paymentsService.verify(paymentId);
          break;
        case 'tabby':
          await bnplService.verifyTabby(paymentId);
          break;
        case 'tamara':
          await bnplService.verifyTamara(paymentId);
          break;
        default:
          throw new Error(`Unknown payment provider: ${provider}`);
      }
      setPaymentStatus('success');
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || 'Payment verification failed.'
      );
      setPaymentStatus('failure');
    }
  }

  if (paymentStatus === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>{t('payment.verifying')}</Text>
          <Text style={styles.loadingSubtitle}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.iconCircleSuccess}>
            <Ionicons name="checkmark" size={48} color={Colors.white} />
          </View>
          <Text style={styles.title}>{t('payment.success')}</Text>
          <Text style={styles.subtitle}>
            {t('payment.success')}
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/bookings')}
          >
            <Text style={styles.primaryButtonText}>{t('payment.viewBookings')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.iconCircleError}>
          <Ionicons name="close" size={48} color={Colors.white} />
        </View>
        <Text style={styles.title}>{t('payment.failed')}</Text>
        <Text style={styles.subtitle}>
          {errorMessage || t('common.unexpectedError')}
        </Text>
        <Pressable style={styles.primaryButton} onPress={verifyPayment}>
          <Text style={styles.primaryButtonText}>{t('payment.tryAgain')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>{t('payment.goBack')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconCircleSuccess: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircleError: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  loadingTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
  },
  loadingSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    width: '100%',
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  secondaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
});
