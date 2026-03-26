import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HostMessagesScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  title: { ...Typography.h2, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
});
