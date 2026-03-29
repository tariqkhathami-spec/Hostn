import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { VatEntry, Property } from '../../types';

interface VatForm {
  propertyId: string;
  propertyName: string;
  taxNumber: string;
}

const emptyForm: VatForm = {
  propertyId: '',
  propertyName: '',
  taxNumber: '',
};

export default function VatScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [form, setForm] = useState<VatForm>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vatEntries'],
    queryFn: () => hostService.getVatEntries(),
    retry: false,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => hostService.getProperties(),
    retry: false,
  });

  const entries: VatEntry[] = data?.data ?? [];
  const properties: Property[] = propertiesData?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => hostService.addVatEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vatEntries'] });
      closeModal();
    },
    onError: () => {
      Alert.alert('\u062E\u0637\u0623', '\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u064A. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.');
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.propertyId) {
      Alert.alert('\u062E\u0637\u0623', '\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631');
      return;
    }
    if (!form.taxNumber.trim()) {
      Alert.alert('\u062E\u0637\u0623', '\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u064A');
      return;
    }
    const payload: Record<string, unknown> = {
      propertyId: form.propertyId,
      propertyName: form.propertyName,
      taxNumber: form.taxNumber,
    };
    addMutation.mutate(payload);
  };

  const renderEntry = ({ item }: { item: VatEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryTitleRow}>
          <Ionicons name="business-outline" size={20} color={Colors.primary} />
          <Text style={styles.entryName}>{item.propertyName}</Text>
        </View>
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>{'\u0645\u0648\u062B\u0642'}</Text>
          </View>
        )}
      </View>
      <View style={styles.taxRow}>
        <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.taxNumber}>{item.taxNumber}</Text>
      </View>
    </View>
  );

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <HeaderBar title={'\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629'} showBack fallbackRoute="/settings" />

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={22} color={Colors.info} />
        <Text style={styles.infoBannerText}>{'\u0646\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 15%'}</Text>
      </View>

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
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.addButtonText}>{'\u0623\u0636\u0641 \u0631\u0642\u0645 \u0636\u0631\u064A\u0628\u064A'}</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0631\u0642\u0627\u0645 \u0636\u0631\u064A\u0628\u064A\u0629'}</Text>
            </View>
          }
        />
      )}

      {/* Add VAT Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'\u0623\u0636\u0641 \u0631\u0642\u0645 \u0636\u0631\u064A\u0628\u064A'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{'\u0627\u0644\u0639\u0642\u0627\u0631'}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setPropertyPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !form.propertyId && { color: Colors.textTertiary },
                  ]}
                >
                  {form.propertyName || '\u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{'\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u064A'}</Text>
              <TextInput
                style={styles.input}
                value={form.taxNumber}
                onChangeText={(text) => setForm((prev) => ({ ...prev, taxNumber: text }))}
                placeholder={'\u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u064A'}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
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
                <Text style={styles.saveButtonText}>{'\u062D\u0641\u0638'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Property Picker Modal */}
      <Modal visible={propertyPickerVisible} transparent animationType="fade" onRequestClose={() => setPropertyPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'\u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631'}</Text>
              <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={properties}
              keyExtractor={(item) => item.id}
              renderItem={({ item: property }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    form.propertyId === property.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setForm((prev) => ({
                      ...prev,
                      propertyId: property.id,
                      propertyName: property.nameAr || property.name,
                    }));
                    setPropertyPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      form.propertyId === property.id && styles.pickerItemTextSelected,
                    ]}
                  >
                    {property.nameAr || property.name}
                  </Text>
                  {form.propertyId === property.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.pickerEmptyText}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0642\u0627\u0631\u0627\u062A'}</Text>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerText: {
    ...Typography.smallBold,
    color: Colors.info,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  entryName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  verifiedText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.xxl,
  },
  taxNumber: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontFamily: undefined,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary200,
    borderStyle: 'dashed',
  },
  addButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
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
