import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { hostService } from '../../services/host.service';
import type { TransferDuration } from '../../types';

type DurationType = TransferDuration['type'];

interface DurationOption {
  type: DurationType;
  title: string;
  description: string;
}

const durationOptions: DurationOption[] = [
  {
    type: 'direct_48h',
    title: 'فوري',
    description: 'خلال 48 ساعة من انتهاء الحجز',
  },
  {
    type: 'threshold',
    title: 'حسب الحد',
    description: 'يتم التحويل عند بلوغ المبلغ المحدد',
  },
  {
    type: 'weekly',
    title: 'أسبوعي',
    description: 'كل أسبوع',
  },
];

export default function TransferDurationScreen() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DurationType>('direct_48h');
  const [thresholdAmount, setThresholdAmount] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['transferDuration'],
    queryFn: () => hostService.getTransferDuration(),
    retry: false,
  });

  const transferDuration: TransferDuration | undefined = data?.data;

  useEffect(() => {
    if (transferDuration) {
      setSelectedType(transferDuration.type);
      if (transferDuration.thresholdAmount) {
        setThresholdAmount(String(transferDuration.thresholdAmount));
      }
    }
  }, [transferDuration]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.updateTransferDuration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferDuration'] });
      Alert.alert('تم', 'تم تحديث مدة التحويل بنجاح');
    },
    onError: () => {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث البيانات');
    },
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = { type: selectedType };
    if (selectedType === 'threshold') {
      const amount = parseFloat(thresholdAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح');
        return;
      }
      payload.thresholdAmount = amount;
    }
    mutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="مدة التحويل" showBack fallbackRoute="/financial" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <HeaderBar title="مدة التحويل" showBack fallbackRoute="/financial" />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="مدة التحويل" showBack fallbackRoute="/financial" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {durationOptions.map((option) => {
          const isSelected = selectedType === option.type;
          return (
            <TouchableOpacity
              key={option.type}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelectedType(option.type)}
              activeOpacity={0.7}
            >
              <View style={styles.optionRow}>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                    {option.title}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>

              {option.type === 'threshold' && isSelected && (
                <View style={styles.thresholdInput}>
                  <Input
                    label="المبلغ (ريال)"
                    value={thresholdAmount}
                    onChangeText={setThresholdAmount}
                    placeholder="مثال: 1000"
                    keyboardType="numeric"
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="حفظ"
          onPress={handleSave}
          loading={mutation.isPending}
          fullWidth
          size="lg"
        />
      </View>
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
    gap: Spacing.md,
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
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  optionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  thresholdInput: {
    marginTop: Spacing.base,
  },
  footer: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    ...Shadows.bottomBar,
  },
});
