import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, Linking, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatPhone, toWesternDigits } from '../../utils/format';
import { useLanguage } from '../../i18n';
import { apiErrorMessage } from '../../utils/apiError';
import { Colors, Typography, Spacing, Radius, BACK_ICON } from '../../constants/theme';

const HOST_APP_DEEP_LINK = 'hostn-host://';
const HOST_APP_WEB_URL = 'https://business.hostn.co';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useLanguage();

  // Map `name` field to firstName/lastName when they're not set
  const derivedFirstName = user?.firstName || (user?.name ? user.name.split(' ')[0] : '');
  const derivedLastName = user?.lastName || (user?.name ? user.name.split(' ').slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(derivedFirstName);
  const [lastName, setLastName] = useState(derivedLastName);
  const [email, setEmail] = useState(user?.email ?? '');

  // Seed inputs when user becomes available after mount (e.g. auth
  // bootstrap finishes after this screen mounts). prev || X means we
  // never overwrite something the user has already typed.
  useEffect(() => {
    if (!user) return;
    setFirstName((prev) => prev || user.firstName || (user.name ? user.name.split(' ')[0] : ''));
    setLastName((prev) => prev || user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''));
    setEmail((prev) => prev || user.email || '');
  }, [user]);

  // Show the new address once it has been confirmed on the verification screen.
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const updateProfile = useMutation({
    // The API stores one `name`. The name is saved first, on its own: a
    // request that carries `email` only starts the email-change flow (a code
    // is emailed) and saves nothing else. The code is then entered on
    // /account/verify-email, which applies the change.
    mutationFn: async () => {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const newEmail = email.trim().toLowerCase();
      const emailChanged = !!newEmail && newEmail !== (user?.email ?? '').trim().toLowerCase();

      if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new Error('EMAIL_INVALID');
      }

      // The API requires a non-empty name; an account without one yet can
      // still change its email.
      if (name) {
        const saved = await authService.updateProfile({ name });
        // The answer is the bare account document (no `role`), so it is merged
        // into the stored user rather than replacing it.
        const current = useAuthStore.getState().user;
        if (saved.user) setUser(current ? { ...current, ...saved.user } : saved.user);
      }

      if (!emailChanged) return { pendingEmail: null };
      await authService.requestEmailChange(newEmail);
      return { pendingEmail: newEmail };
    },
    onSuccess: ({ pendingEmail }) => {
      if (pendingEmail) {
        // The email is not changed until the code sent to it is confirmed:
        // show the current one again and go and ask for the code.
        setEmail(user?.email ?? '');
        router.push({ pathname: '/account/verify-email', params: { email: pendingEmail } });
        return;
      }
      Alert.alert(t('common.success'), t('profile.saved'));
    },
    onError: (error: any) => {
      if (error?.message === 'EMAIL_INVALID') {
        Alert.alert(t('common.error'), t('profile.emailInvalid'));
        return;
      }
      // The server's text for this case is English only.
      if (/already registered/i.test(String(error?.response?.data?.message ?? ''))) {
        Alert.alert(t('common.error'), t('profile.emailTaken'));
        return;
      }
      Alert.alert(t('common.error'), apiErrorMessage(error, t('common.somethingWrong')));
    },
  });

  const [codeVisible, setCodeVisible] = useState(false);
  const [codeKind, setCodeKind] = useState<'otp' | 'password'>('otp');
  const [codePrompt, setCodePrompt] = useState('');
  const [code, setCode] = useState('');

  const deleteAccount = useMutation({
    mutationFn: (confirm?: { otp?: string; password?: string }) => authService.deleteAccount(confirm),
    onSuccess: async () => {
      setCodeVisible(false);
      await logout();
      router.replace('/(auth)/phone');
    },
    onError: (error: any) => {
      // First attempt: the server sends a code (or asks for the password).
      const reason = error?.response?.data?.code;
      if (reason === 'OTP_REQUIRED' || reason === 'PASSWORD_REQUIRED') {
        setCodeKind(reason === 'OTP_REQUIRED' ? 'otp' : 'password');
        setCodePrompt(error.response.data.message);
        setCode('');
        setCodeVisible(true);
        return;
      }
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.somethingWrong'));
    },
  });

  const handleBecomeHost = () => {
    Alert.alert(
      t('profile.becomeHost'),
      t('profile.becomeHostMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.upgrade'),
          onPress: async () => {
            const canOpenDeepLink = await Linking.canOpenURL(HOST_APP_DEEP_LINK).catch(() => false);
            const target = canOpenDeepLink ? HOST_APP_DEEP_LINK : HOST_APP_WEB_URL;
            try {
              await Linking.openURL(target);
            } catch {
              Alert.alert(t('common.error'), t('common.somethingWrong'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccount'),
              t('profile.deleteConfirmFinal'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('profile.deletePermanently'), style: 'destructive', onPress: () => deleteAccount.mutate(undefined) },
              ]
            );
          },
        },
      ]
    );
  };

  const renderField = (label: string, value: string, onChangeText: (t: string) => void, opts?: { keyboard?: 'email-address' }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={opts?.keyboard}
        autoCapitalize={opts?.keyboard === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderField(t('profile.firstName'), firstName, setFirstName)}
        {renderField(t('profile.lastName'), lastName, setLastName)}
        {renderField(t('profile.email'), email, setEmail, { keyboard: 'email-address' })}

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.phone')}</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>
              {user?.phone ? formatPhone(user.phone, '+966') : ''}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.saveButton}
          onPress={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveText}>{t('profile.save')}</Text>
          )}
        </Pressable>

        {/* Account Actions */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>{t('account.title')}</Text>

          {user?.role === 'guest' && (
            <Pressable style={styles.hostButton} onPress={handleBecomeHost}>
              <Ionicons name="home-outline" size={20} color={Colors.white} />
              <Text style={styles.hostButtonText}>{t('profile.becomeHost')}</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
      <Modal visible={codeVisible} transparent animationType="fade" onRequestClose={() => setCodeVisible(false)}>
        <View style={codeStyles.backdrop}>
          <View style={codeStyles.box}>
            <Text style={codeStyles.title}>{codePrompt}</Text>
            <TextInput
              style={codeStyles.input}
              value={code}
              onChangeText={setCode}
              keyboardType={codeKind === 'otp' ? 'number-pad' : 'default'}
              secureTextEntry={codeKind === 'password'}
              maxLength={codeKind === 'otp' ? 6 : 100}
              autoFocus
            />
            <View style={codeStyles.actions}>
              <Pressable style={codeStyles.secondary} onPress={() => setCodeVisible(false)}>
                <Text style={codeStyles.secondaryText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={codeStyles.danger}
                disabled={!code.trim() || deleteAccount.isPending}
                onPress={() => deleteAccount.mutate(codeKind === 'otp' ? { otp: toWesternDigits(code.trim()) } : { password: code })}
              >
                <Text style={codeStyles.dangerText}>{t('profile.deletePermanently')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const codeStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 15, color: '#111827', textAlign: 'center', lineHeight: 22 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, textAlign: 'center', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12 },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  danger: { flex: 1, backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.xl, gap: Spacing.base },
  field: { gap: Spacing.xs },
  label: { ...Typography.smallBold, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.body, color: Colors.textPrimary,
  },
  inputDisabled: { backgroundColor: Colors.surface },
  disabledText: { ...Typography.body, color: Colors.textTertiary },
  saveButton: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.base,
    borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveText: { ...Typography.bodyBold, color: Colors.white },
  // Account section
  accountSection: {
    marginTop: Spacing.xxl,
    gap: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  hostButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hostButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  deleteButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
});
