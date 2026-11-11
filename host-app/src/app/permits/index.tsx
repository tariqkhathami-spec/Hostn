import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toWesternDigits } from '../../utils/format';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import type { UnitPermit } from '../../types';

interface PropertyPermitGroup {
  propertyId: string;
  propertyName: string;
  units: UnitPermit[];
}

const permitStatusConfig: Record<
  UnitPermit['permitStatus'],
  { bg: string; text: string; label: string }
> = {
  none: { bg: Colors.surfaceAlt, text: Colors.textSecondary, label: 'لا يوجد تصريح' },
  pending: { bg: '#fef3c7', text: '#d97706', label: 'قيد المراجعة' },
  approved: { bg: '#dcfce7', text: '#059669', label: 'معتمد' },
  rejected: { bg: '#fecaca', text: '#dc2626', label: 'مرفوض' },
};

export default function PermitsScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['permits'],
    queryFn: hostService.getPermits,
    retry: false,
  });

  const properties: PropertyPermitGroup[] = data?.data ?? [];

  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    unitId: string;
    unitName: string;
    permitNumber: string;
    expiryDate: string;
    image: { uri: string; name: string; type: string } | null;
  } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: FormData }) => hostService.uploadPermit(unitId, data),
    onSuccess: () => {
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      Alert.alert('تم', 'تم إرسال التصريح وسيظهر كمعتمد بعد مراجعة الإدارة');
    },
    onError: (error: any) =>
      Alert.alert('خطأ', error?.response?.data?.message || 'تعذّر حفظ التصريح. حاول مرة أخرى.'),
  });

  const handleAddPermit = (unitId: string, unitName: string) => {
    setForm({ unitId, unitName, permitNumber: '', expiryDate: '', image: null });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setForm((prev) =>
      prev
        ? {
            ...prev,
            image: {
              uri: asset.uri,
              name: asset.fileName || 'permit.jpg',
              type: asset.mimeType || 'image/jpeg',
            },
          }
        : prev,
    );
  };

  const submitPermit = () => {
    if (!form) return;
    const permitNumber = toWesternDigits(form.permitNumber.trim());
    const expiryDate = toWesternDigits(form.expiryDate.trim());
    if (!permitNumber) {
      Alert.alert('خطأ', 'اكتب رقم التصريح');
      return;
    }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      Alert.alert('خطأ', 'اكتب تاريخ الانتهاء بالصيغة 2027-12-31');
      return;
    }
    const data = new FormData();
    data.append('permitNumber', permitNumber);
    if (expiryDate) data.append('expiryDate', expiryDate);
    if (form.image) data.append('document', form.image as any);
    uploadMutation.mutate({ unitId: form.unitId, data });
  };

  const renderPermitBadge = (permit: UnitPermit) => {
    const config = permitStatusConfig[permit.permitStatus];
    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <View style={[styles.badgeDot, { backgroundColor: config.text }]} />
        <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
      </View>
    );
  };

  const renderUnitCard = (unit: UnitPermit) => (
    <Card key={unit.unitId} style={styles.unitCard}>
      <View style={styles.unitRow}>
        {unit.thumbnailUrl ? (
          <Image source={{ uri: unit.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="home-outline" size={24} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.unitInfo}>
          <Text style={styles.unitName}>{unit.unitName}</Text>
          <Text style={styles.unitLocation}>{unit.location}</Text>
          {renderPermitBadge(unit)}
          {(unit.permitStatus === 'approved' || unit.permitStatus === 'pending') && unit.permitNumber && (
            <Text style={styles.permitNumber}>رقم التصريح: {unit.permitNumber}</Text>
          )}
          {unit.permitStatus === 'rejected' && unit.rejectionReason ? (
            <Text style={[styles.permitNumber, { color: '#dc2626' }]}>سبب الرفض: {unit.rejectionReason}</Text>
          ) : null}
        </View>
      </View>
      {(unit.permitStatus === 'none' || unit.permitStatus === 'rejected') && (
        <Button
          title={unit.permitStatus === 'rejected' ? 'أعد إرسال التصريح' : 'أضف التصريح'}
          onPress={() => handleAddPermit(unit.unitId, unit.unitName)}
          variant="primary"
          size="sm"
          fullWidth
          style={styles.addButton}
        />
      )}
    </Card>
  );

  return (
    <ScreenWrapper>
      <HeaderBar title="تصريح وزارة السياحة" showBack />
      <Modal visible={!!form} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <View style={permitDialog.backdrop}>
          <View style={permitDialog.box}>
            <Text style={permitDialog.title}>{`تصريح الوحدة: ${form?.unitName ?? ''}`}</Text>
            <TextInput
              style={permitDialog.input}
              value={form?.permitNumber ?? ''}
              onChangeText={(permitNumber) => setForm((prev) => (prev ? { ...prev, permitNumber } : prev))}
              placeholder="رقم التصريح"
              placeholderTextColor={Colors.textTertiary}
              maxLength={60}
              autoCapitalize="characters"
            />
            <TextInput
              style={permitDialog.input}
              value={form?.expiryDate ?? ''}
              onChangeText={(expiryDate) => setForm((prev) => (prev ? { ...prev, expiryDate } : prev))}
              placeholder={"تاريخ الانتهاء، اختياري \u2066 2027-12-31 \u2069"}
              placeholderTextColor={Colors.textTertiary}
              maxLength={10}
            />
            <TouchableOpacity style={permitDialog.attach} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={permitDialog.attachText}>
                {form?.image ? 'تم اختيار صورة التصريح' : 'إرفاق صورة التصريح (اختياري)'}
              </Text>
            </TouchableOpacity>
            <View style={permitDialog.actions}>
              <TouchableOpacity style={permitDialog.secondary} onPress={() => setForm(null)}>
                <Text style={permitDialog.secondaryText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={permitDialog.primary} onPress={submitPermit} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending
                  ? <ActivityIndicator color={Colors.textWhite} />
                  : <Text style={permitDialog.primaryText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          message="حدث خطأ في تحميل التصاريح"
          submessage="اسحب للأسفل للمحاولة مرة أخرى"
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <TouchableOpacity style={styles.infoBanner} activeOpacity={0.7}>
            <Ionicons name="information-circle" size={22} color={Colors.primary} />
            <Text style={styles.infoBannerText}>
              تعرف على قرار وزارة السياحة رقم 2295
            </Text>
            <Ionicons name="open-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>

          {properties.length === 0 ? (
            <EmptyState
              icon="document-outline"
              message="لا توجد عقارات لعرض التصاريح"
              submessage="أضف عقاراتك أولاً لتتمكن من إدارة التصاريح"
            />
          ) : (
            properties.map((property) => (
              <View key={property.propertyId} style={styles.propertySection}>
                <View style={styles.propertyHeader}>
                  <Text style={styles.propertyName}>{property.propertyName}</Text>
                  <Text style={styles.unitCount}>
                    {property.units.length} وحدة
                  </Text>
                </View>
                {property.units.map(renderUnitCard)}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const permitDialog = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  box: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  title: { ...Typography.subtitle, color: Colors.textPrimary, textAlign: TEXT_START },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  attach: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  attachText: { ...Typography.small, color: Colors.primary },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  primary: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryText: { ...Typography.bodyBold, color: Colors.textWhite },
  secondary: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  secondaryText: { ...Typography.bodyBold, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoBannerText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  propertySection: {
    marginBottom: Spacing.xl,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  propertyName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  unitCount: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  unitCard: {
    marginBottom: Spacing.md,
  },
  unitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  unitName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  unitLocation: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  permitNumber: {
    ...Typography.caption,
    color: Colors.success,
    textAlign: 'right',
  },
  addButton: {
    marginTop: Spacing.md,
  },
});
