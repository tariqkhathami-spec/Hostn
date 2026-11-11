import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { toWesternDigits } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const menuItems: MenuItem[] = [
  // Booking managers (sub-accounts) are hidden until the server supports them.
  {
    label: 'إعدادات الحجز',
    icon: 'calendar-outline',
    route: '/settings/booking-rules',
  },
  {
    label: 'ضريبة القيمة المضافة',
    icon: 'receipt-outline',
    route: '/settings/vat',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const deleteMutation = useMutation({
    mutationFn: (confirm?: { otp?: string; password?: string }) => hostService.deleteAccount(confirm),
    onSuccess: async () => {
      setCodeVisible(false);
      await logout();
      // Same destination as signing out. '/(auth)/onboarding' is the host
      // introduction programme, which made a deleted account land on a
      // screen meant for signed-in hosts.
      router.replace('/(auth)/phone-entry' as any);
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
      // e.g. the server refuses while bookings are still open
      Alert.alert('خطأ', error?.response?.data?.message || 'حدث خطأ أثناء حذف الحساب');
    },
  });

  const [codeVisible, setCodeVisible] = useState(false);
  const [codeKind, setCodeKind] = useState<'otp' | 'password'>('otp');
  const [codePrompt, setCodePrompt] = useState('');
  const [code, setCode] = useState('');

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'تأكيد نهائي',
              'سيتم حذف حسابك وجميع بياناتك بشكل نهائي. هل تريد المتابعة؟',
              [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حذف نهائي', style: 'destructive', onPress: () => deleteMutation.mutate(undefined) },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar title={'الإعدادات'} showBack />
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
              <TouchableOpacity style={codeStyles.secondary} onPress={() => setCodeVisible(false)}>
                <Text style={codeStyles.secondaryText}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={codeStyles.danger}
                disabled={!code.trim() || deleteMutation.isPending}
                onPress={() => deleteMutation.mutate(codeKind === 'otp' ? { otp: toWesternDigits(code.trim()) } : { password: code })}
              >
                <Text style={codeStyles.dangerText}>{'حذف نهائي'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.card}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account Section */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleteMutation.isPending}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.deleteButtonText}>
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف الحساب'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const codeStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 15, color: '#111827', textAlign: 'right', lineHeight: 22 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, textAlign: 'center', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12 },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  danger: { flex: 1, backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  container: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  deleteSection: {
    padding: Spacing.base,
    marginTop: Spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
  },
  deleteButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
});
