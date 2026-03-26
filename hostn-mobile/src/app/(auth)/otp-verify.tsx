import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { formatPhone } from '../../utils/format';
import { APP_CONFIG } from '../../constants/config';

export default function OTPVerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.otpResendSeconds);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && index === 5 && newOtp.every((d) => d)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await authService.verifyOTP(phone!, otpCode);
      setAuth(result.token, result.user, result.refreshToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.sendOTP(phone!);
      setCountdown(APP_CONFIG.otpResendSeconds);
      setError('');
    } catch {
      setError('Failed to resend OTP');
    }
  };

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.heading}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.phoneText}>{formatPhone(phone || '')}</Text>
          </Text>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.changeText}>Change number</Text>
          </TouchableOpacity>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, digit && styles.otpInputFilled, error && styles.otpInputError]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {countdown > 0 ? (
            <Text style={styles.countdown}>Resend code in {formatCountdown()}</Text>
          ) : (
            <View style={styles.resendRow}>
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendText}>Resend via SMS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          <Button
            title="Verify"
            onPress={() => handleVerify()}
            loading={loading}
            disabled={otp.some((d) => !d)}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  heading: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneText: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  changeText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  otpInputError: {
    borderColor: Colors.error,
  },
  error: {
    ...Typography.small,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  countdown: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  resendRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  resendText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
});
