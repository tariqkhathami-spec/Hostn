import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GalleryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: listing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsService.getById(id!),
    enabled: !!id,
  });

  const images = (listing?.images ?? []).map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean) as string[];
  const numColumns = 3;
  const imageSize = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.xs * (numColumns - 1)) / numColumns;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Gallery ({images.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={images}
        numColumns={numColumns}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setSelectedIndex(index)}>
            <Image source={{ uri: item }} style={{ width: imageSize, height: imageSize, borderRadius: Radius.xs }} contentFit="cover" />
          </Pressable>
        )}
      />

      {/* Fullscreen Viewer */}
      <Modal visible={selectedIndex !== null} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={styles.closeButton} onPress={() => setSelectedIndex(null)}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </Pressable>
          {selectedIndex !== null && (
            <Image
              source={{ uri: images[selectedIndex] }}
              style={styles.fullImage}
              contentFit="contain"
            />
          )}
          <Text style={styles.counter}>
            {(selectedIndex ?? 0) + 1} / {images.length}
          </Text>
        </View>
      </Modal>
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
  grid: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  row: { gap: Spacing.xs, marginBottom: Spacing.xs },
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center',
  },
  closeButton: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 8 },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  counter: { ...Typography.body, color: Colors.white, marginTop: Spacing.base },
});
