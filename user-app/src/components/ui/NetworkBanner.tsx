import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import { Colors, Typography, Spacing } from '../../constants/theme';

// Backend mounts /health/ready at the root, not under the /api/v* prefix that
// API_URL points to. Strip the api-version suffix so the health probe hits the
// real route instead of 404'ing and showing a permanent "offline" banner.
const HEALTH_URL = API_URL.replace(/\/api\/v\d+\/?$/, '') + '/health/ready';

export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(HEALTH_URL, { timeout: 5000 });
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };

    checkConnection();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkConnection();
    });

    const interval = setInterval(checkConnection, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.sm,
  },
  text: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
  },
});
