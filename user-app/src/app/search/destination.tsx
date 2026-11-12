import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../store/searchStore';
import { useLanguage } from '../../i18n';
import { POPULAR_CITY_VALUES } from '../../constants/config';
import { CITIES } from '../../constants/cities';

// Popular cities first, then the rest in list order.
const POPULAR = new Set<string>(POPULAR_CITY_VALUES);
const ORDERED_CITIES = [
  ...CITIES.filter((c) => POPULAR.has(c.value)),
  ...CITIES.filter((c) => !POPULAR.has(c.value)),
];
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

export default function DestinationScreen() {
  const router = useRouter();
  const setCity = useSearchStore((s) => s.setCity);
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');

  const query = search.trim();
  const filtered = ORDERED_CITIES.filter(
    (c) =>
      c.en.toLowerCase().includes(query.toLowerCase()) ||
      c.value.toLowerCase().includes(query.toLowerCase()) ||
      c.ar.includes(query)
  );

  const handleSelect = (cityValue: string) => {
    setCity(cityValue, cityValue);
    router.push('/search/type-guests');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('search.whereTo')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.searchCities')}
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.value}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const primary = language === 'ar' ? item.ar : item.en;
          const secondary = language === 'ar' ? item.en : item.ar;
          return (
            <Pressable style={styles.cityRow} onPress={() => handleSelect(item.value)}>
              <Ionicons name="location-outline" size={22} color={Colors.primary} />
              <View>
                <Text style={styles.cityName}>{primary}</Text>
                <Text style={styles.cityNameAr}>{secondary}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.base },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cityName: { ...Typography.body, color: Colors.textPrimary },
  cityNameAr: { ...Typography.caption, color: Colors.textSecondary },
});
