import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { authService } from '../services/auth.service';
import { Colors } from '../constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const onboardingSeen = useUIStore((s) => s.onboardingSeen);

  useEffect(() => {
    async function bootstrap() {
      const { token } = await loadStoredAuth();

      if (!token) {
        if (!onboardingSeen) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(auth)/phone');
        }
        return;
      }

      try {
        const user = await authService.getMe();
        setUser(user);
        router.replace('/(tabs)');
      } catch {
        setLoading(false);
        router.replace('/(auth)/phone');
      }
    }

    bootstrap();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
