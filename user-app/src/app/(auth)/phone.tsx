import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { toWesternDigits } from '../../utils/format';
import { apiErrorMessage } from '../../utils/apiError';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

// Sign-in is by Saudi mobile number only: the API accepts /^5\d{8}$/ with +966.
const SAUDI = {
  code: '+966',
  flag: '\u{1F1F8}\u{1F1E6}',
  digits: 9,
  placeholder: '5X XXX XXXX',
};

/** National number without the country code or a leading 0. */
function toLocalSaudi(input: string): string {
  let digits = toWesternDigits(input).replace(/\D/g, '');
  if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

type OtpMethod = 'sms' | 'whatsapp';

export default function PhoneScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('sms');

  const isValid = /^5\d{8}$/.test(toLocalSaudi(phone));

  const handleSendOtp = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const localPhone = toLocalSaudi(phone);

      await authService.sendOtp(localPhone, {
        countryCode: SAUDI.code,
        method: otpMethod,
      });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: localPhone, countryCode: SAUDI.code },
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), apiErrorMessage(error, t('auth.sendFailed')));
    } finally {
      setLoading(false);
    }
  };

  // Signing in is optional: leave this screen and keep browsing as a guest.
  const handleBrowseAsGuest = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="phone-portrait-outline" size={32} color={Colors.white} />
          </View>
          <Text style={styles.title}>{t('auth.enterPhone')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.phoneSub')}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          {/* Fixed prefix: only Saudi numbers can sign in. */}
          <View style={styles.countryCode}>
            <Text style={styles.flag}>{SAUDI.flag}</Text>
            <Text style={styles.codeText}>{SAUDI.code}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={SAUDI.placeholder}
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={SAUDI.digits + 4}
            value={phone}
            onChangeText={(text) => setPhone(toWesternDigits(text))}
            autoFocus
          />
        </View>

        {/* OTP Method Selector */}
        <View style={styles.methodContainer}>
          <Text style={styles.methodLabel}>{t('auth.sendVia')}</Text>
          <View style={styles.methodToggle}>
            <Pressable
              style={[
                styles.methodOption,
                otpMethod === 'sms' && styles.methodOptionActive,
              ]}
              onPress={() => setOtpMethod('sms')}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={otpMethod === 'sms' ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodText,
                  otpMethod === 'sms' && styles.methodTextActive,
                ]}
              >
                {t('auth.sms')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.methodOption,
                otpMethod === 'whatsapp' && styles.methodOptionActive,
              ]}
              onPress={() => setOtpMethod('whatsapp')}
            >
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={otpMethod === 'whatsapp' ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodText,
                  otpMethod === 'whatsapp' && styles.methodTextActive,
                ]}
              >
                {t('auth.whatsapp')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.sendCode')}</Text>
          )}
        </Pressable>

        <Pressable style={styles.guestButton} onPress={handleBrowseAsGuest} hitSlop={8}>
          <Text style={styles.guestButtonText}>{t('auth.browseAsGuest')}</Text>
        </Pressable>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  guestButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.base,
    marginTop: Spacing.sm,
  },
  guestButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  flag: {
    fontSize: 20,
  },
  codeText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  // OTP Method styles
  methodContainer: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  methodLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  methodToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.background,
  },
  methodOptionActive: {
    backgroundColor: Colors.primary,
  },
  methodText: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  methodTextActive: {
    color: Colors.white,
  },
  // Button styles
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalSheetSafe: {
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  countryList: {
    padding: Spacing.xl,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    gap: Spacing.md,
  },
  countryItemSelected: {
    backgroundColor: Colors.primary50,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  countryCodeText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
