import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { TermsOfUse } from '../../types';

const FALLBACK_ARTICLES: TermsOfUse['articles'] = [
  { number: 1, title: 'التعريفات', content: 'يقصد بالمصطلحات الواردة في هذه الاتفاقية المعاني المبينة أمام كل منها: "المنصة" تعني منصة هوستن الإلكترونية. "المضيف" يعني الشخص الطبيعي أو الاعتباري الذي يعرض وحدته السكنية على المنصة. "الضيف" يعني الشخص الذي يحجز الوحدة السكنية عبر المنصة.' },
  { number: 2, title: 'نطاق الخدمة', content: 'توفر المنصة خدمة الوساطة بين المضيفين والضيوف لحجز الوحدات السكنية المفروشة. لا تعد المنصة طرفاً في عقد الإيجار بين المضيف والضيف. يلتزم المضيف بضمان دقة المعلومات المقدمة عن الوحدة السكنية.' },
  { number: 3, title: 'التزامات المضيف', content: 'يلتزم المضيف بالحصول على جميع التراخيص والتصاريح اللازمة لتشغيل الوحدة السكنية وفقاً للأنظمة والقوانين المعمول بها. يجب أن تكون الوحدة مطابقة للوصف المعروض على المنصة وأن تكون نظيفة وآمنة ومجهزة بالكامل.' },
  { number: 4, title: 'التسعير والعمولات', content: 'يحدد المضيف أسعار الإيجار بشكل مستقل. تحصل المنصة على عمولة متفق عليها من كل حجز مكتمل. يتم خصم العمولة تلقائياً قبل تحويل المبلغ للمضيف. تشمل الأسعار ضريبة القيمة المضافة حسب الأنظمة المعمول بها.' },
  { number: 5, title: 'الحجز والإلغاء', content: 'يلتزم المضيف بقبول الحجوزات المؤكدة عبر المنصة وعدم إلغائها إلا للأسباب المذكورة في سياسة الإلغاء. في حالة إلغاء المضيف للحجز بدون سبب مشروع، قد يتم تطبيق عقوبات تشمل تخفيض الترتيب أو تعليق الحساب.' },
  { number: 6, title: 'المدفوعات والتحويلات', content: 'تتم عمليات الدفع عبر بوابات الدفع المعتمدة من المنصة. يتم تحويل مستحقات المضيف وفقاً للجدول الزمني المحدد في إعدادات الحساب. يتحمل المضيف مسؤولية صحة البيانات البنكية المدخلة.' },
  { number: 7, title: 'التقييمات والمراجعات', content: 'يحق للضيوف تقييم تجربتهم بعد انتهاء الإقامة. يحق للمضيف الرد على التقييمات. لا يجوز للمضيف طلب إزالة تقييم إلا في حالة مخالفته لسياسة المنصة.' },
  { number: 8, title: 'المسؤولية والتأمين', content: 'المضيف مسؤول بالكامل عن سلامة الوحدة السكنية وسلامة الضيوف. توفر المنصة برنامج حماية المضيف لتغطية الأضرار وفقاً للشروط المحددة. لا تتحمل المنصة مسؤولية الأضرار الناتجة عن إهمال المضيف.' },
  { number: 9, title: 'الخصوصية وحماية البيانات', content: 'تلتزم المنصة بحماية بيانات المضيفين والضيوف وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية. يوافق المضيف على استخدام بياناته لتحسين الخدمة ولأغراض إحصائية.' },
  { number: 10, title: 'تعليق وإنهاء الحساب', content: 'يحق للمنصة تعليق أو إنهاء حساب المضيف في حالة مخالفة الشروط أو الأنظمة. يحق للمضيف طلب إلغاء حسابه بعد إكمال جميع الحجوزات النشطة وتسوية جميع المستحقات.' },
  { number: 11, title: 'القانون الواجب التطبيق', content: 'تخضع هذه الاتفاقية لأنظمة وقوانين المملكة العربية السعودية. في حالة نشوء أي نزاع، يتم اللجوء إلى الجهات القضائية المختصة في المملكة العربية السعودية.' },
];

export default function TermsScreen() {
  const queryClient = useQueryClient();
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<{ data: TermsOfUse }>({
    queryKey: ['terms'],
    queryFn: hostService.getTerms,
    retry: false,
  });

  const signMutation = useMutation({
    mutationFn: hostService.signTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });

  const terms = data?.data;
  const articles = terms?.articles?.length ? terms.articles : FALLBACK_ARTICLES;
  const isSigned = terms?.signed ?? false;
  const signedDate = terms?.signedDate;

  const toggleArticle = (articleNumber: number) => {
    setExpandedArticle(prev => (prev === articleNumber ? null : articleNumber));
  };

  return (
    <ScreenWrapper>
      <HeaderBar title={'اتفاقية الاستخدام'} showBack />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>حدث خطأ في تحميل الشروط والأحكام</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerSection}>
              <Ionicons name="document-text" size={40} color={Colors.primary} />
              <Text style={styles.headerTitle}>{'اتفاقية استخدام منصة هوستن'}</Text>
              {terms?.version && (
                <Text style={styles.versionText}>{'الإصدار: '}{terms.version}</Text>
              )}
            </View>

            {articles.map((article) => (
              <View key={article.number} style={styles.articleContainer}>
                <TouchableOpacity
                  style={styles.articleHeader}
                  onPress={() => toggleArticle(article.number)}
                  activeOpacity={0.7}
                >
                  <View style={styles.articleTitleRow}>
                    <Text style={styles.articleNumber}>{'المادة '}{article.number}</Text>
                    <Text style={styles.articleTitle}>{': '}{article.title}</Text>
                  </View>
                  <Ionicons
                    name={expandedArticle === article.number ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedArticle === article.number && (
                  <View style={styles.articleContent}>
                    <Text style={styles.articleText}>{article.content}</Text>
                  </View>
                )}
              </View>
            ))}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            {isSigned ? (
              <View style={styles.signedContainer}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                <Text style={styles.signedText}>
                  {'تم الموافقة بتاريخ '}{signedDate || ''}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.agreeButton}
                onPress={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                activeOpacity={0.8}
              >
                {signMutation.isPending ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <Text style={styles.agreeButtonText}>{'أوافق على الشروط'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.base,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  articleContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  articleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    writingDirection: 'rtl',
  },
  articleNumber: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  articleTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  articleContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  articleText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bottomBar: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    ...Shadows.bottomBar,
  },
  signedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  signedText: {
    ...Typography.bodyBold,
    color: Colors.success,
  },
  agreeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  agreeButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
