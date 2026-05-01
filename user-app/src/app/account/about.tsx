import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage, type TranslationKey } from '../../i18n';

const APP_VERSION = '1.0.0';

type Value = { icon: 'shield-checkmark-outline' | 'home-outline' | 'star-outline' | 'globe-outline'; titleKey: TranslationKey; descKey: TranslationKey };
const VALUES: Value[] = [
  { icon: 'shield-checkmark-outline', titleKey: 'about.value.trusted', descKey: 'about.value.trustedDesc' },
  { icon: 'home-outline', titleKey: 'about.value.properties', descKey: 'about.value.propertiesDesc' },
  { icon: 'star-outline', titleKey: 'about.value.topRated', descKey: 'about.value.topRatedDesc' },
  { icon: 'globe-outline', titleKey: 'about.value.localExpertise', descKey: 'about.value.localExpertiseDesc' },
];

type LinkItem =
  | { labelKey: TranslationKey; url: string; icon: 'globe-outline' | 'document-text-outline' | 'shield-checkmark-outline'; isRoute?: false }
  | { labelKey: TranslationKey; url: string; icon: 'globe-outline' | 'document-text-outline' | 'shield-checkmark-outline'; isRoute: true };

const LINKS: LinkItem[] = [
  { labelKey: 'about.website', url: 'https://hostn.co', icon: 'globe-outline' },
  { labelKey: 'account.terms', url: '/account/terms', icon: 'document-text-outline', isRoute: true },
  { labelKey: 'account.privacy', url: '/account/privacy', icon: 'shield-checkmark-outline', isRoute: true },
];

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLink = (item: LinkItem) => {
    if (item.isRoute) {
      router.push(item.url as any);
    } else {
      Linking.openURL(item.url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('account.about')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo & App Info */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="home" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Hostn</Text>
          <Text style={styles.version}>{t('about.version', { version: APP_VERSION })}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{t('about.description')}</Text>

        {/* Key Values */}
        <View style={styles.valuesGrid}>
          {VALUES.map((item) => (
            <View key={item.titleKey} style={styles.valueCard}>
              <Ionicons name={item.icon} size={28} color={Colors.primary} />
              <Text style={styles.valueTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.valueDesc}>{t(item.descKey)}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <View style={styles.linksSection}>
          {LINKS.map((item) => (
            <Pressable key={item.labelKey} style={styles.linkItem} onPress={() => handleLink(item)}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
              <Text style={styles.linkLabel}>{t(item.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.copyright}>{t('about.copyright')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  appName: { ...Typography.h1, color: Colors.textPrimary },
  version: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  description: {
    ...Typography.body, color: Colors.textSecondary, lineHeight: 24,
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  valuesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.md, marginBottom: Spacing.xl,
  },
  valueCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: Spacing.base, gap: Spacing.xs, ...Shadows.sm,
  },
  valueTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  valueDesc: { ...Typography.caption, color: Colors.textSecondary },
  linksSection: {
    backgroundColor: Colors.white, borderRadius: Radius.md, ...Shadows.sm,
  },
  linkItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  linkLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  copyright: {
    ...Typography.caption, color: Colors.textTertiary,
    textAlign: 'center', marginTop: Spacing.xl,
  },
});
