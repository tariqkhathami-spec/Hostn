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
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { toWesternDigits } from '../../utils/format';
import { apiErrorMessage } from '../../utils/apiError';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius, BACK_ICON } from '../../constants/theme';

// The server emails a 6-digit code (PUT /auth/profile { email }).
const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Second step of changing the email: the profile screen has already asked the
 * server to email a code to `email`; this screen sends the code back. The
 * account keeps its old email until the code is accepted.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { t } = useLanguage();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleCodeChange = (next: string) => {
    if (errorMsg) setErrorMsg(null);
    if (notice) setNotice(null);
    setCode(toWesternDigits(next).replace(/\D/g, '').slice(0, CODE_LENGTH));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify();
    }
  }, [code]);

  // The server's messages for this flow are English only, so they are mapped
  // to the app's own text here.
  const errorText = (error: any): string => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message ?? '');
    if (/already registered/i.test(message)) return t('profile.emailTaken');
    if (status === 400) return apiErrorMessage(error, t('profile.verifyEmailInvalid'));
    return apiErrorMessage(error, t('common.somethingWrong'));
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH || !email || loading) return;
    setLoading(true);
    try {
      const updated = await authService.confirmEmailChange(email, code);
      // The answer is the bare account document (no `role`), so it is merged
      // into the stored user rather than replacing it.
      const { user, setUser } = useAuthStore.getState();
      if (user) setUser({ ...user, ...(updated ?? {}), email: updated?.email ?? email });
      else if (updated) setUser(updated);
      Alert.alert(t('common.success'), t('profile.verifyEmailDone'));
      router.back();
    } catch (error: any) {
      setCode('');
      setErrorMsg(errorText(error));
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email || resending) return;
    setResending(true);
    try {
      // Asking again replaces the previous code with a new one.
      await authService.requestEmailChange(email);
      setCountdown(RESEND_SECONDS);
      setCode('');
      setErrorMsg(null);
      setNotice(t('profile.verifyEmailResent'));
    } catch (error: any) {
      const message = String(error?.response?.data?.message ?? '');
      Alert.alert(
        t('common.error'),
        /already registered/i.test(message) ? t('profile.emailTaken') : apiErrorMessage(error, t('auth.resendFailed')),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.verifyEmailTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('profile.verifyEmailBody', { length: CODE_LENGTH })}{'\n'}
            {email ?? ''}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Pressable style={styles.codeContainer} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.codeBox,
                  i < code.length && styles.codeBoxFilled,
                  i === code.length && !errorMsg && styles.codeBoxActive,
                  errorMsg && styles.codeBoxError,
                ]}
              >
                <Text style={[styles.codeDigit, errorMsg && styles.codeDigitError]}>{code[i] || ''}</Text>
              </View>
            ))}
          </Pressable>
        </Animated.View>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          value={code}
          onChangeText={handleCodeChange}
          autoFocus
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : notice ? (
          <Text style={styles.noticeText}>{notice}</Text>
        ) : null}

        <Text style={styles.note}>{t('profile.verifyEmailNote')}</Text>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>{t('auth.didntReceive')}</Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>{t('auth.resendIn', { seconds: countdown })}</Text>
          ) : resending ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Pressable onPress={handleResend} hitSlop={12}>
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
    textAlign: 'center',
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
    // A code reads left to right in both languages.
    direction: 'ltr',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  codeBox: {
    flex: 1,
    maxWidth: 52,
    height: 60,
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
  codeBoxError: {
    borderColor: Colors.error,
    backgroundColor: 'transparent',
  },
  codeDigit: {
    ...Typography.h2,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  codeDigitError: {
    color: Colors.error,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  noticeText: {
    ...Typography.small,
    color: Colors.success,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  note: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
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
