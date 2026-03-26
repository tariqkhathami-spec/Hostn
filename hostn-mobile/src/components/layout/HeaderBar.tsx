import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface HeaderBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export default function HeaderBar({
  title,
  showBack = true,
  onBack,
  rightIcon,
  onRightPress,
  backgroundColor = Colors.background,
  textColor = Colors.textPrimary,
}: HeaderBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>
        {rightIcon && onRightPress && (
          <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
            <Ionicons name={rightIcon} size={24} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    ...Typography.subtitle,
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    padding: Spacing.xs,
  },
});
