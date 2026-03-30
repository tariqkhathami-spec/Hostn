import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { APP_CONFIG } from '../../constants/config';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuthStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.otpResendCooldown);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length < APP_CONFIG.otpLength) return;
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone ?? '', code);

      const token: string = res.token ?? res.data?.token ?? '';
      const host = res.host ?? res.user ?? res.data?.host ?? res.data?.user ?? null;
      const onboardingCompleted: boolean =
        host?.onboardingCompleted ??
        res.onboardingCompleted ??
        res.data?.onboardingCompleted ??
        false;

      if (token && host) {
        await login(token, { ...host, onboardingCompleted });
      } else if (token) {
        // Minimal host data - store token
        await login(token, {
          id: '',
          name: '',
          email: '',
          phone: phone ?? '',
          onboardingCompleted,
        });
      }

      if (!onboardingCompleted) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'رمز التحقق غير صحيح';
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (method: 'sms' | 'whatsapp' = 'sms') => {
    setResendLoading(true);
    try {
      await authService.sendOtp(phone ?? '', method);
      setCountdown(APP_CONFIG.otpResendCooldown);
      setCode('');
      Alert.alert('', method === 'whatsapp'
        ? 'تم إرسال رمز التحقق عبر واتساب'
        : 'تم إرسال رمز التحقق مرة أخرى');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'حدث خطأ أثناء إعادة إرسال الرمز';
      Alert.alert(t('common.error'), message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back button — allows user to correct phone number */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/phone-login' as any)}
      >
        <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
        <Text style={styles.backText}>تغيير الرقم</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.otp')}</Text>
        <Text style={styles.subtitle}>
          تم إرسال رمز التحقق إلى{'\n'}
          <Text style={styles.phoneHighlight}>+966{phone}</Text>
        </Text>

        <View style={styles.otpContainer}>
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={APP_CONFIG.otpLength}
            autoFocus
            textAlign="center"
            placeholder="----"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <Button
          title={t('auth.verify')}
          onPress={handleVerify}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={code.length < APP_CONFIG.otpLength}
        />

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>
              {t('auth.resend')} ({countdown}s)
            </Text>
          ) : (
            <View style={styles.resendButtons}>
              <Button
                title="إعادة عبر SMS"
                onPress={() => handleResend('sms')}
                variant="ghost"
                size="sm"
                loading={resendLoading}
              />
              <TouchableOpacity onPress={() => handleResend('whatsapp')} disabled={resendLoading}>
                <Text style={styles.whatsappText}>عبر واتساب</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  backText: {
    ...Typography.small,
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
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
    lineHeight: 26,
  },
  phoneHighlight: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  otpContainer: {
    marginBottom: Spacing.xl,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: Colors.surface,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  countdown: {
    ...Typography.small,
    color: Colors.textTertiary,
  },
  resendButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  whatsappText: {
    ...Typography.small,
    color: '#25D366',
    fontWeight: '600',
  },
});
