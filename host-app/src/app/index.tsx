import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { loadStoredAuth, login, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { token } = await loadStoredAuth();

        if (token) {
          // Validate token and fetch host profile / onboarding status
          try {
            const statusRes = await authService.getOnboardingStatus();
            const host = statusRes.host ?? statusRes.data?.host ?? null;
            const onboardingCompleted =
              host?.onboardingCompleted ??
              statusRes.onboardingCompleted ??
              statusRes.data?.onboardingCompleted ??
              false;

            if (host) {
              await login(token, { ...host, onboardingCompleted });
            }

            if (!onboardingCompleted) {
              router.replace('/(auth)/onboarding');
            } else {
              router.replace('/(tabs)/dashboard');
            }
          } catch {
            // If onboarding status fails (e.g. guest role), go to onboarding
            // rather than kicking back to login since we have a valid token
            router.replace('/(auth)/onboarding');
          }
        } else {
          router.replace('/(auth)/phone-entry');
        }
      } catch {
        router.replace('/(auth)/phone-entry');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Hostn</Text>
      <ActivityIndicator size="large" color={Colors.white} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  logo: {
    ...Typography.h1,
    fontSize: 48,
    color: Colors.white,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginTop: Spacing.base,
  },
});
