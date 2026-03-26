import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { propertyService } from '../../services/property.service';
import type { PropertyImage } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_GAP = 4;
const ITEM_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - COLUMN_GAP) / 2;

type TabType = 'all' | 'images' | 'videos';

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertyService.getById(id!),
    enabled: !!id,
  });

  const images = useMemo(() => {
    if (!property?.images) return [];
    if (activeTab === 'all') return property.images;
    if (activeTab === 'images') return property.images;
    // Videos tab - filter video URLs if any exist
    return property.images.filter(
      (img) => img.url.includes('.mp4') || img.url.includes('.mov')
    );
  }, [property?.images, activeTab]);

  const renderTab = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.tabActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: PropertyImage }) => (
    <TouchableOpacity
      style={styles.imageItem}
      activeOpacity={0.85}
      onPress={() => setSelectedImage(item)}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.gridImage}
        contentFit="cover"
        transition={200}
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Gallery" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="Gallery" />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {renderTab('all', 'All')}
        {renderTab('images', 'Images')}
        {renderTab('videos', 'Videos')}
      </View>

      {/* Image Grid */}
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No media found</Text>
          </View>
        }
      />

      {/* Full-screen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={28} color={Colors.textWhite} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage.url }}
              style={styles.fullImage}
              contentFit="contain"
              transition={200}
            />
          )}
          {selectedImage?.caption && (
            <Text style={styles.captionText}>{selectedImage.caption}</Text>
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textWhite,
  },

  // Grid
  gridContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  imageItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  captionText: {
    ...Typography.body,
    color: Colors.textWhite,
    marginTop: Spacing.base,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
});
