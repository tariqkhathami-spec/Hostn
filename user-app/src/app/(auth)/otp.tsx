import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatPhone } from '../../utils/format';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

const OTP_LENGTH = 4;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, countryCode } = useLocalSearchParams<{ phone: string; countryCode?: string }>();
  const login = useAuthStore((s) => s.login);
  const { t } = useLanguage();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (code.length === OTP_LENGTH) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH || !phone) return;
    setLoading(true);
    try {
      const result = await authService.verifyOtp(phone, code);
      await login(result.token, result.refreshToken, result.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      setCode('');
      Alert.alert(
        t('auth.invalidCode'),
        error.response?.data?.message || t('auth.invalidCodeMsg')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !phone) return;
    try {
      await authService.sendOtp(phone, { countryCode: countryCode ?? '+966' });
      setCountdown(60);
      setCode('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.verifyNumber')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.enterCode', { length: OTP_LENGTH })}{'\n'}
            {phone ? formatPhone(phone) : ''}
          </Text>
        </View>

        <Pressable style={styles.codeContainer} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeBox,
                i < code.length && styles.codeBoxFilled,
                i === code.length && styles.codeBoxActive,
              ]}
            >
              <Text style={styles.codeDigit}>{code[i] || ''}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          value={code}
          onChangeText={setCode}
          autoFocus
          textContentType="oneTimeCode"
        />

        {loading && (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        )}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>{t('auth.didntReceive')}</Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>{t('auth.resendIn', { seconds: countdown })}</Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendButton}>{t('auth.resendCode')}</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    paddingVertical: Spacing.base,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  codeBox: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    borderColor: Colors.primary,
  },
  codeBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary50,
  },
  codeDigit: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  resendRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  resendText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  countdownText: {
    ...Typography.smallBold,
    color: Colors.textTertiary,
  },
  resendButton: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
});
