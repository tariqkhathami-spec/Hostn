import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { BookingRule, Property } from '../../types';

interface RuleForm {
  applyToAll: boolean;
  unitId: string;
  unitName: string;
  minNights: string;
}

const emptyForm: RuleForm = {
  applyToAll: true,
  unitId: '',
  unitName: '',
  minNights: '1',
};

export default function BookingRulesScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookingRules'],
    queryFn: () => hostService.getBookingRules(),
    retry: false,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const rules: BookingRule[] = data?.data ?? [];
  const properties: Property[] = propertiesData?.data ?? [];

  const allUnits = properties.flatMap((p) =>
    p.units.map((u) => ({ id: u.id, name: `${p.nameAr || p.name} - ${u.name}` })),
  );

  const addMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.addBookingRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingRules'] });
      closeModal();
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إضافة القاعدة. حاول مرة أخرى.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hostService.deleteBookingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingRules'] });
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل حذف القاعدة. حاول مرة أخرى.');
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setForm(emptyForm);
  };

  const handleSave = () => {
    const minNights = parseInt(form.minNights, 10);
    if (isNaN(minNights) || minNights < 1) {
      Alert.alert('خطأ', 'يرجى إدخال عدد ليالي صحيح');
      return;
    }
    if (!form.applyToAll && !form.unitId) {
      Alert.alert('خطأ', 'يرجى اختيار الوحدة');
      return;
    }
    const payload: Record<string, unknown> = {
      applyToAll: form.applyToAll,
      minNights,
      ...(form.applyToAll ? {} : { unitId: form.unitId, unitName: form.unitName }),
    };
    addMutation.mutate(payload);
  };

  const handleDelete = (rule: BookingRule) => {
    Alert.alert(
      'حذف القاعدة',
      'هل تريد حذف هذه القاعدة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(rule.id),
        },
      ],
    );
  };

  const renderRule = ({ item }: { item: BookingRule }) => (
    <View style={styles.ruleCard}>
      <View style={styles.ruleInfo}>
        <View style={styles.ruleHeader}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.ruleName}>
            {item.applyToAll ? 'جميع الوحدات' : item.unitName || 'وحدة محددة'}
          </Text>
        </View>
        <View style={styles.nightsRow}>
          <Ionicons name="moon-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.nightsText}>
            {'الحد الأدنى: '}{item.minNights}{' ليالي'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar
        title={'إعدادات الحجز'}
        showBack
        fallbackRoute="/settings"
        rightActions={
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={26} color={Colors.textWhite} />
          </TouchableOpacity>
        }
      />

      {isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
          <Text style={{ ...Typography.body, color: Colors.textTertiary, marginTop: Spacing.md }}>حدث خطأ في تحميل البيانات</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderRule}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{'لا توجد قواعد حجز'}</Text>
            </View>
          }
        />
      )}

      {/* Add Rule Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'أضف قاعدة'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>{'تطبيق على جميع الوحدات'}</Text>
              <Switch
                value={form.applyToAll}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, applyToAll: val, unitId: '', unitName: '' }))
                }
                trackColor={{ false: Colors.border, true: Colors.primary300 }}
                thumbColor={form.applyToAll ? Colors.primary : Colors.textTertiary}
              />
            </View>

            {!form.applyToAll && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{'اختر الوحدة'}</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setUnitPickerVisible(true)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !form.unitId && { color: Colors.textTertiary },
                    ]}
                  >
                    {form.unitName || 'اختر وحدة'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{'الحد الأدنى لليالي'}</Text>
              <TextInput
                style={styles.input}
                value={form.minNights}
                onChangeText={(text) => setForm((prev) => ({ ...prev, minNights: text }))}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={Colors.textTertiary}
                textAlign="right"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, addMutation.isPending && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={addMutation.isPending}
              activeOpacity={0.7}
            >
              {addMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.textWhite} />
              ) : (
                <Text style={styles.saveButtonText}>{'حفظ'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal visible={unitPickerVisible} transparent animationType="fade" onRequestClose={() => setUnitPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'اختر الوحدة'}</Text>
              <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allUnits}
              keyExtractor={(item) => item.id}
              renderItem={({ item: unit }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    form.unitId === unit.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, unitId: unit.id, unitName: unit.name }));
                    setUnitPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      form.unitId === unit.id && styles.pickerItemTextSelected,
                    ]}
                  >
                    {unit.name}
                  </Text>
                  {form.unitId === unit.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.pickerEmptyText}>{'لا توجد وحدات'}</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  ruleCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  ruleInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ruleName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  nightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.xxl,
  },
  nightsText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  formGroup: {
    marginBottom: Spacing.base,
  },
  formLabel: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  pickerButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  pickerModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '60%',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary50,
  },
  pickerItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerEmptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
