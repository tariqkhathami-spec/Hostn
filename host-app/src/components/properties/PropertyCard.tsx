import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import type { Property } from '../../types';

interface Props {
  property: Property;
  onPress: () => void;
}

export default function PropertyCard({ property, onPress }: Props) {
  const isListed = property.status === 'listed';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      {/* Thumbnail placeholder */}
      <View style={styles.thumbnail}>
        <Ionicons name="business-outline" size={32} color={Colors.textTertiary} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {property.nameAr || property.name}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.city} numberOfLines={1}>
            {property.address?.city}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {/* Unit count badge */}
          <View style={styles.unitBadge}>
            <Ionicons name="cube-outline" size={12} color={Colors.primary} />
            <Text style={styles.unitCount}>
              {property.unitCount ?? property.units?.length ?? 0} وحدات
            </Text>
          </View>

          {/* Status indicator */}
          <View style={[styles.statusBadge, isListed ? styles.statusListed : styles.statusUnlisted]}>
            <View style={[styles.statusDot, { backgroundColor: isListed ? Colors.success : Colors.textTertiary }]} />
            <Text style={[styles.statusText, { color: isListed ? Colors.success : Colors.textTertiary }]}>
              {isListed ? 'معروض' : 'غير معروض'}
            </Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  city: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  unitCount: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  statusListed: {
    backgroundColor: '#dcfce7',
  },
  statusUnlisted: {
    backgroundColor: Colors.surfaceAlt,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chevron: {
    paddingRight: Spacing.xs,
  },
});
