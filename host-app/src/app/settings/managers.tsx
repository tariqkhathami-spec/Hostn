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
import type { ReservationManager } from '../../types';

interface ManagerForm {
  name: string;
  phone: string;
  smsEnabled: boolean;
  status: 'active' | 'inactive';
}

const emptyForm: ManagerForm = {
  name: '',
  phone: '',
  smsEnabled: false,
  status: 'active',
};

export default function ManagersScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['managers'],
    queryFn: () => hostService.getManagers(),
    retry: false,
  });

  const managers: ReservationManager[] = data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.addManager(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      closeModal();
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إضافة المدير. حاول مرة أخرى.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      hostService.updateManager(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      closeModal();
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل تحديث بيانات المدير. حاول مرة أخرى.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hostService.deleteManager(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل حذف المدير. حاول مرة أخرى.');
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEditModal = (manager: ReservationManager) => {
    setForm({
      name: manager.name,
      phone: manager.phone,
      smsEnabled: manager.smsEnabled,
      status: manager.status,
    });
    setEditingId(manager.id);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    const payload: Record<string, unknown> = { ...form };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const handleDelete = (manager: ReservationManager) => {
    Alert.alert(
      'حذف المدير',
      `هل تريد حذف ${manager.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(manager.id),
        },
      ],
    );
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  const renderManager = ({ item }: { item: ReservationManager }) => (
    <TouchableOpacity
      style={styles.managerCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.managerName}>{item.name}</Text>
          {item.isOwner && (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>{'مالك'}</Text>
            </View>
          )}
        </View>
        {!item.isOwner && (
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name={item.smsEnabled ? 'chatbubble' : 'chatbubble-outline'}
            size={16}
            color={item.smsEnabled ? Colors.success : Colors.textTertiary}
          />
          <Text style={[styles.detailText, { color: item.smsEnabled ? Colors.success : Colors.textTertiary }]}>
            {item.smsEnabled ? 'الرسائل مفعلة' : 'الرسائل معطلة'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? '#dcfce7' : '#f3f4f6' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.status === 'active' ? Colors.success : Colors.textTertiary },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: item.status === 'active' ? Colors.success : Colors.textTertiary },
            ]}
          >
            {item.status === 'active' ? 'نشط' : 'غير نشط'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar
        title={'مدراء الحجوزات'}
        showBack
        fallbackRoute="/settings"
        rightActions={
          <TouchableOpacity onPress={openAddModal}>
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
          data={managers}
          keyExtractor={(item) => item.id}
          renderItem={renderManager}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{'لا يوجد مدراء حجوزات'}</Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Modal */}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'تعديل المدير' : 'أضف مدير'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{'الاسم'}</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                placeholder={'أدخل اسم المدير'}
                placeholderTextColor={Colors.textTertiary}
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{'رقم الهاتف'}</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))}
                placeholder="05XXXXXXXX"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>{'تفعيل الرسائل النصية'}</Text>
              <Switch
                value={form.smsEnabled}
                onValueChange={(val) => setForm((prev) => ({ ...prev, smsEnabled: val }))}
                trackColor={{ false: Colors.border, true: Colors.primary300 }}
                thumbColor={form.smsEnabled ? Colors.primary : Colors.textTertiary}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>{'الحالة'}</Text>
              <View style={styles.statusToggle}>
                <Text style={styles.statusToggleText}>
                  {form.status === 'active' ? 'نشط' : 'غير نشط'}
                </Text>
                <Switch
                  value={form.status === 'active'}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, status: val ? 'active' : 'inactive' }))
                  }
                  trackColor={{ false: Colors.border, true: Colors.primary300 }}
                  thumbColor={form.status === 'active' ? Colors.primary : Colors.textTertiary}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.textWhite} />
              ) : (
                <Text style={styles.saveButtonText}>{'حفظ'}</Text>
              )}
            </TouchableOpacity>
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
  managerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  managerName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  ownerBadge: {
    backgroundColor: Colors.gold50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold400,
  },
  ownerBadgeText: {
    ...Typography.tiny,
    color: Colors.gold500,
    fontWeight: '600',
  },
  cardDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
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
    maxHeight: '80%',
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
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusToggleText: {
    ...Typography.small,
    color: Colors.textSecondary,
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
