import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { hostService } from '../../services/host.service';
import type { PaymentMethod } from '../../types';

export default function PaymentMethodScreen() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['paymentMethod'],
    queryFn: () => hostService.getPaymentMethod(),
    retry: false,
  });

  const paymentMethod: PaymentMethod | undefined = data?.data;

  const bankMutation = useMutation({
    mutationFn: (bankData: Record<string, unknown>) => hostService.updateBankDetails(bankData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethod'] });
      setIsEditing(false);
      Alert.alert('تم', 'تم تحديث بيانات الحساب البنكي بنجاح');
    },
    onError: () => {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث البيانات');
    },
  });

  const handleEdit = () => {
    if (paymentMethod) {
      setIban(paymentMethod.iban || '');
      setBankName(paymentMethod.bankName || '');
      setAccountHolder(paymentMethod.accountHolder || '');
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    bankMutation.mutate({ iban, bankName, accountHolder });
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="طريقة الدفع" showBack fallbackRoute="/financial" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <HeaderBar title="طريقة الدفع" showBack fallbackRoute="/financial" />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="طريقة الدفع" showBack fallbackRoute="/financial" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Bank Transfer Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRight}>
              <View style={styles.iconBg}>
                <Ionicons name="business-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>حوالة بنكية</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Input
                label="الآيبان (IBAN)"
                value={iban}
                onChangeText={setIban}
                placeholder="SA..."
                autoCapitalize="characters"
              />
              <Input
                label="اسم البنك"
                value={bankName}
                onChangeText={setBankName}
                placeholder="مثال: البنك الأهلي"
              />
              <Input
                label="اسم صاحب الحساب"
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder="الاسم كما في الحساب البنكي"
              />
              <View style={styles.editActions}>
                <Button
                  title="حفظ"
                  onPress={handleSave}
                  loading={bankMutation.isPending}
                  style={styles.saveButton}
                />
                <Button
                  title="إلغاء"
                  onPress={() => setIsEditing(false)}
                  variant="outline"
                  style={styles.cancelButton}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{paymentMethod?.iban || '---'}</Text>
                <Text style={styles.detailLabel}>الآيبان</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{paymentMethod?.bankName || '---'}</Text>
                <Text style={styles.detailLabel}>اسم البنك</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{paymentMethod?.accountHolder || '---'}</Text>
                <Text style={styles.detailLabel}>صاحب الحساب</Text>
              </View>
              <Button
                title="تعديل"
                onPress={handleEdit}
                variant="outline"
                size="sm"
                style={styles.editButton}
              />
            </>
          )}
        </Card>

        {/* STC Pay Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRight}>
              <View style={[styles.iconBg, { backgroundColor: Colors.primary100 }]}>
                <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>STC Pay</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{paymentMethod?.stcPayNumber || '---'}</Text>
            <Text style={styles.detailLabel}>رقم الجوال</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <View style={styles.feeContainer}>
              <Text style={styles.feeText}>رسوم 0.5%</Text>
            </View>
            <Text style={styles.detailLabel}>الرسوم</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  card: {
    padding: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.base,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  editButton: {
    marginTop: Spacing.base,
    alignSelf: 'flex-start',
  },
  editForm: {
    gap: Spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  saveButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  feeContainer: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  feeText: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
});
