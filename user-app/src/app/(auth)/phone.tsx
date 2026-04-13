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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface GCCCountry {
  name: string;
  code: string;
  flag: string;
  maxDigits: number;
  minDigits: number;
  startsWith?: string;
  placeholder: string;
}

const GCC_COUNTRIES: GCCCountry[] = [
  { name: 'Saudi Arabia', code: '+966', flag: '\u{1F1F8}\u{1F1E6}', maxDigits: 9, minDigits: 9, startsWith: '5', placeholder: '5X XXX XXXX' },
  { name: 'UAE', code: '+971', flag: '\u{1F1E6}\u{1F1EA}', maxDigits: 9, minDigits: 8, placeholder: 'XX XXX XXXX' },
  { name: 'Bahrain', code: '+973', flag: '\u{1F1E7}\u{1F1ED}', maxDigits: 8, minDigits: 8, placeholder: 'XXXX XXXX' },
  { name: 'Kuwait', code: '+965', flag: '\u{1F1F0}\u{1F1FC}', maxDigits: 8, minDigits: 8, placeholder: 'XXXX XXXX' },
  { name: 'Oman', code: '+968', flag: '\u{1F1F4}\u{1F1F2}', maxDigits: 8, minDigits: 8, placeholder: 'XXXX XXXX' },
  { name: 'Qatar', code: '+974', flag: '\u{1F1F6}\u{1F1E6}', maxDigits: 8, minDigits: 8, placeholder: 'XXXX XXXX' },
];

type OtpMethod = 'sms' | 'whatsapp';

export default function PhoneScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<GCCCountry>(GCC_COUNTRIES[0]);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('sms');

  const validatePhone = (phoneNumber: string, country: GCCCountry): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < country.minDigits || digits.length > country.maxDigits) return false;
    if (country.startsWith && !digits.startsWith(country.startsWith)) return false;
    return true;
  };

  const isValid = validatePhone(phone, selectedCountry);

  const handleSendOtp = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      let localPhone = phone.replace(/\D/g, '');
      // Strip country code prefix if user typed it
      const codeDigits = selectedCountry.code.replace('+', '');
      if (localPhone.startsWith(codeDigits)) localPhone = localPhone.slice(codeDigits.length);
      if (localPhone.startsWith('0')) localPhone = localPhone.slice(1);

      await authService.sendOtp(localPhone, {
        countryCode: selectedCountry.code,
        method: otpMethod,
      });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: localPhone, countryCode: selectedCountry.code },
      });
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCountry = (country: GCCCountry) => {
    setSelectedCountry(country);
    setCountryModalVisible(false);
    setPhone('');
  };

  const renderCountryItem = ({ item }: { item: GCCCountry }) => (
    <Pressable
      style={[
        styles.countryItem,
        item.code === selectedCountry.code && styles.countryItemSelected,
      ]}
      onPress={() => handleSelectCountry(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryCodeText}>{item.code}</Text>
      {item.code === selectedCountry.code && (
        <Ionicons name="checkmark" size={20} color={Colors.primary} />
      )}
    </Pressable>
  );

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
          <Pressable
            style={styles.countryCode}
            onPress={() => setCountryModalVisible(true)}
          >
            <Text style={styles.flag}>{selectedCountry.flag}</Text>
            <Text style={styles.codeText}>{selectedCountry.code}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={selectedCountry.placeholder}
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={selectedCountry.maxDigits + 3}
            value={phone}
            onChangeText={setPhone}
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
                SMS
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
                WhatsApp
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
      </KeyboardAvoidingView>

      {/* Country Selector Modal */}
      <Modal
        visible={countryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('auth.selectCountry')}</Text>
            <Pressable onPress={() => setCountryModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <FlatList
            data={GCC_COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            contentContainerStyle={styles.countryList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
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
