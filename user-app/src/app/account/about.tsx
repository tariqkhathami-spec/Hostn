import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

const APP_VERSION = '1.0.0';

const VALUES = [
  { icon: 'shield-checkmark-outline' as const, title: 'Trusted', desc: 'Verified hosts and secure payments' },
  { icon: 'home-outline' as const, title: '1,000+ Properties', desc: 'Across Saudi Arabia' },
  { icon: 'star-outline' as const, title: 'Top Rated', desc: '4.8 average guest rating' },
  { icon: 'globe-outline' as const, title: 'Local Expertise', desc: 'Built for the Saudi market' },
];

const LINKS = [
  { label: 'Website', url: 'https://hostn.co', icon: 'globe-outline' as const },
  { label: 'Terms of Use', url: '/account/terms', icon: 'document-text-outline' as const, isRoute: true },
  { label: 'Privacy Policy', url: '/account/privacy', icon: 'shield-checkmark-outline' as const, isRoute: true },
];

export default function AboutScreen() {
  const router = useRouter();

  const handleLink = (item: (typeof LINKS)[number]) => {
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
        <Text style={styles.title}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo & App Info */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="home" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Hostn</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Hostn is Saudi Arabia's premier vacation rental platform, connecting travelers with unique
          stays across the Kingdom. From luxury villas in Jeddah to cozy chalets in Al Baha, we make
          it easy to discover, book, and enjoy the best accommodations Saudi Arabia has to offer.
        </Text>

        {/* Key Values */}
        <View style={styles.valuesGrid}>
          {VALUES.map((item) => (
            <View key={item.title} style={styles.valueCard}>
              <Ionicons name={item.icon} size={28} color={Colors.primary} />
              <Text style={styles.valueTitle}>{item.title}</Text>
              <Text style={styles.valueDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <View style={styles.linksSection}>
          {LINKS.map((item) => (
            <Pressable key={item.label} style={styles.linkItem} onPress={() => handleLink(item)}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
              <Text style={styles.linkLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.copyright}>Made with love in Saudi Arabia</Text>
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
