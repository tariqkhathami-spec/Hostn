import React, { useState } from 'react';
import { Alert, ActivityIndicator, View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../../services/host.service';
import { apiErrorMessage } from '../../../utils/apiError';
import { Colors, Typography, Spacing, Radius, DirectionalIcon } from '../../../constants/theme';
import type { Unit } from '../../../types';

// ---------------------------------------------------------------------------
// Duplicate a unit: POST /units/:id/duplicate with the real unit id.
//
// The server copies the unit inside the same property (name gets "(نسخة)",
// no tourism permit, no ratings). The host chooses whether photos and prices
// are copied too, then lands on the copy's edit screen to rename it.
// ---------------------------------------------------------------------------

export default function DuplicateUnitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [copyImages, setCopyImages] = useState(true);
  const [copyPricing, setCopyPricing] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => hostService.getUnit(id!),
    enabled: !!id,
    retry: false,
  });
  const unit: Unit | undefined = (data as any)?.data ?? undefined;

  const mutation = useMutation({
    mutationFn: () => {
      // Blocked dates belong to the original unit, never to the copy.
      const exclude = ['unavailableDates'];
      if (!copyImages) exclude.push('images');
      if (!copyPricing) exclude.push('pricing');
      return hostService.duplicateUnit(id!, exclude);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      const newId = res?.data?._id || res?.data?.id;
      Alert.alert(
        'تم نسخ الوحدة',
        'أُنشئت نسخة من الوحدة داخل العقار نفسه. عدّل اسمها وبياناتها حتى تميّزها عن الأصلية.',
        [
          newId
            ? {
                text: 'تعديل النسخة',
                onPress: () =>
                  router.replace({ pathname: '/property/edit-unit/[id]', params: { id: String(newId) } }),
              }
            : { text: 'موافق', onPress: () => router.back() },
        ],
      );
    },
    onError: (error: unknown) => {
      Alert.alert('خطأ', apiErrorMessage(error, 'تعذّر نسخ الوحدة. حاول مرة أخرى.'));
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.subtleText}>جاري التحميل...</Text>
      </View>
    );
  }

  if (isError || !unit) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.subtleText}>تعذّر تحميل بيانات الوحدة.</Text>
        <Pressable style={styles.smallButton} onPress={() => refetch()}>
          <Text style={styles.smallButtonText}>إعادة المحاولة</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={() => router.back()}>
          <Text style={styles.smallButtonText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const unitName = unit.nameAr || unit.nameEn || unit.name || 'وحدة بدون اسم';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={DirectionalIcon.arrowBack} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>نسخ الوحدة</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>الوحدة الأصلية</Text>
          <Text style={styles.cardValue}>{unitName}</Text>
        </View>

        <Text style={styles.hint}>
          ستُنشأ وحدة جديدة داخل العقار نفسه بنفس التفاصيل (السعة، الغرف، المرافق، الوصف). لا تُنسخ الحجوزات ولا
          التواريخ المحجوبة ولا تصريح السياحة.
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>نسخ الصور</Text>
          <Switch
            value={copyImages}
            onValueChange={setCopyImages}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>نسخ الأسعار والخصومات</Text>
          <Switch
            value={copyPricing}
            onValueChange={setCopyPricing}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>

        {(!copyImages || !copyPricing) && (
          <Text style={styles.warning}>
            {`النسخة ستبقى مخفية عن الضيوف حتى تضيف لها ${[
              !copyPricing ? 'الأسعار' : '',
              !copyImages ? 'الصور' : '',
            ]
              .filter(Boolean)
              .join(' و')}.`}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>نسخ الوحدة</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  subtleText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  smallButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  smallButtonText: { ...Typography.bodyBold, color: Colors.textPrimary },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  body: { flex: 1, padding: Spacing.xl },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
  },
  cardLabel: { ...Typography.caption, color: Colors.textSecondary },
  cardValue: { ...Typography.bodyBold, color: Colors.textPrimary },
  hint: {
    ...Typography.small,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  toggleLabel: { ...Typography.body, color: Colors.textPrimary },
  warning: { ...Typography.small, color: '#b45309', marginTop: Spacing.base, lineHeight: 20 },

  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { ...Typography.bodyBold, color: Colors.white },
});
