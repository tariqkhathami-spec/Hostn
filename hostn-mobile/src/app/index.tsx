import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isAuthenticated, hasCompletedOnboarding } = useAuthStore();

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/phone-entry" />;
  }
  return <Redirect href="/(tabs)" />;
}
