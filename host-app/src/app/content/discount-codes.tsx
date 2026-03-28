import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import type { DiscountCode } from '../../types';

export default function DiscountCodesScreen() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['discount-codes'],
    queryFn: () => hostService.getDiscountCodes(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      hostService.createDiscountCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      setShowModal(false);
      setNewCode('');
      setNewPercent('');
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إنشاء كود الخصم');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => hostService.toggleDiscountCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    },
  });

  const codes: DiscountCode[] = data?.data || [];

  const handleCreate = useCallback(() => {
    const percent = parseInt(newPercent, 10);
    if (!newCode.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كود الخصم');
      return;
    }
    if (isNaN(percent) || percent < 1 || percent > 100) {
      Alert.alert('خطأ', 'يرجى إدخال نسبة خصم صحيحة (1-100)');
      return;
    }
    createMutation.mutate({ code: newCode.trim(), discountPercent: percent });
  }, [newCode, newPercent, createMutation]);

  const renderCode = useCallback(
    ({ item }: { item: DiscountCode }) => (
      <Card style={styles.codeCard}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeText}>{item.code}</Text>
          <Switch
            value={item.active}
            onValueChange={() => toggleMutation.mutate(item.id)}
            trackColor={{ false: Colors.border, true: Colors.primary300 }}
            thumbColor={item.active ? Colors.primary : Colors.textTertiary}
          />
        </View>
        <View style={styles.codeDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{item.discountPercent}% خصم</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{item.usageCount} استخدام</Text>
          </View>
        </View>
        <Text style={styles.codeDate}>{item.createdAt}</Text>
      </Card>
    ),
    [toggleMutation],
  );

  return (
    <ScreenWrapper>
      <HeaderBar
        title="أكواد الخصم"
        showBack
        rightActions={
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.textWhite} />
          </TouchableOpacity>
        }
      />

      {isError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={{ ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm }}>حدث خطأ في تحميل أكواد الخصم</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          renderItem={renderCode}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Button
              title="أضف كود خصم"
              onPress={() => setShowModal(true)}
              variant="outline"
              fullWidth
              style={styles.addButton}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              message="لا توجد أكواد خصم"
              submessage="أنشئ كود خصم جديد لمشاركته مع الضيوف"
            />
          }
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}

      {/* Add Code Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة كود خصم جديد</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="كود الخصم"
              placeholder="مثال: HOSTN20"
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="characters"
            />

            <Input
              label="نسبة الخصم %"
              placeholder="مثال: 20"
              value={newPercent}
              onChangeText={setNewPercent}
              keyboardType="numeric"
            />

            <Button
              title="إنشاء الكود"
              onPress={handleCreate}
              loading={createMutation.isPending}
              fullWidth
              size="lg"
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
    paddingBottom: Spacing.xxxl,
  },
  addButton: {
    marginBottom: Spacing.base,
  },
  codeCard: {
    marginBottom: Spacing.sm,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  codeText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  codeDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  codeDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
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
    paddingBottom: Spacing.xxxl,
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
});
