import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Invoice } from '../../types';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => hostService.getInvoiceDetail(id!),
    enabled: !!id,
    retry: false,
  });

  const invoice: Invoice | undefined = data?.data;

  const handleShare = async () => {
    if (!invoice) return;
    try {
      await Share.share({
        message: `فاتورة ضريبية رقم ${invoice.invoiceNumber} - المبلغ: ${formatCurrency(invoice.totalWithTax)}`,
      });
    } catch {
      // Share cancelled or failed
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper backgroundColor={Colors.primary}>
        <HeaderBar title="فاتورة ضريبية" showBack fallbackRoute="/invoices" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !invoice) {
    return (
      <ScreenWrapper backgroundColor={Colors.primary}>
        <HeaderBar title="فاتورة ضريبية" showBack fallbackRoute="/invoices" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>حدث خطأ في تحميل الفاتورة</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>حاول مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title="فاتورة ضريبية" showBack fallbackRoute="/invoices" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Header */}
        <Card style={styles.headerCard}>
          <Text style={styles.invoiceTitle}>فاتورة ضريبية مبسطة</Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>رقم الفاتورة:</Text>
            <Text style={styles.headerValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>التاريخ:</Text>
            <Text style={styles.headerValue}>{formatDate(invoice.date)}</Text>
          </View>
        </Card>

        {/* Vendor Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>معلومات البائع</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الاسم:</Text>
            <Text style={styles.infoValue}>{invoice.vendorName}</Text>
          </View>
          {invoice.vendorTaxNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الرقم الضريبي:</Text>
              <Text style={styles.infoValue}>{invoice.vendorTaxNumber}</Text>
            </View>
          )}
        </Card>

        {/* Buyer Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>معلومات المشتري</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الاسم:</Text>
            <Text style={styles.infoValue}>{invoice.buyerName}</Text>
          </View>
        </Card>

        {/* Unit Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>معلومات الوحدة</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>اسم الوحدة:</Text>
            <Text style={styles.infoValue}>{invoice.unitName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>رمز الوحدة:</Text>
            <Text style={styles.infoValue}>{invoice.unitCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>المدينة:</Text>
            <Text style={styles.infoValue}>{invoice.city}</Text>
          </View>
        </Card>

        {/* Reservation Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>معلومات الحجز</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>تاريخ الدخول:</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.checkIn)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>تاريخ الخروج:</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.checkOut)}</Text>
          </View>
        </Card>

        {/* Line Items Table */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>البنود</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.cellDesc]}>الوصف</Text>
                <Text style={[styles.tableHeaderCell, styles.cellSmall]}>الكمية</Text>
                <Text style={[styles.tableHeaderCell, styles.cellMedium]}>سعر الوحدة</Text>
                <Text style={[styles.tableHeaderCell, styles.cellSmall]}>الضريبة</Text>
                <Text style={[styles.tableHeaderCell, styles.cellMedium]}>الإجمالي</Text>
              </View>
              {/* Table Rows */}
              {invoice.lineItems.map((item, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.cellDesc]}>{item.description}</Text>
                  <Text style={[styles.tableCell, styles.cellSmall]}>{item.quantity}</Text>
                  <Text style={[styles.tableCell, styles.cellMedium]}>{formatCurrency(item.unitPrice)}</Text>
                  <Text style={[styles.tableCell, styles.cellSmall]}>{formatCurrency(item.taxAmount)}</Text>
                  <Text style={[styles.tableCell, styles.cellMedium]}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Financial Summary */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ملخص مالي</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المبلغ الخاضع للضريبة</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.taxableAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ضريبة القيمة المضافة 15%</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.vatAmount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>الإجمالي مع الضريبة</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.totalWithTax)}</Text>
          </View>
        </Card>

        {/* QR Code Placeholder */}
        <Card style={styles.qrCard}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={64} color={Colors.textTertiary} />
          </View>
        </Card>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color={Colors.white} />
          <Text style={styles.shareButtonText}>مشاركة الفاتورة</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    ...Typography.smallBold,
    color: Colors.white,
  },
  headerCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  invoiceTitle: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  headerLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerValue: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  infoValue: {
    ...Typography.small,
    color: Colors.textPrimary,
    textAlign: 'left',
    flex: 1,
    marginLeft: Spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary100,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tableHeaderCell: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tableRowAlt: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xs,
  },
  tableCell: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cellDesc: {
    width: 120,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cellSmall: {
    width: 70,
  },
  cellMedium: {
    width: 90,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summaryValue: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    ...Typography.bodyBold,
    color: Colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  totalValue: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  qrCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  shareButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
});
