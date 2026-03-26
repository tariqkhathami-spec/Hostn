import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const { initialize, isLoading, isAuthenticated, hasCompletedOnboarding } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            {!hasCompletedOnboarding ? (
              <Stack.Screen name="(auth)/onboarding" />
            ) : !isAuthenticated ? (
              <Stack.Screen name="(auth)" />
            ) : (
              <>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="search/destination"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="search/type-guests"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="search/dates"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="results/index" />
                <Stack.Screen name="listing/[id]" />
                <Stack.Screen name="gallery/[id]" />
                <Stack.Screen name="checkout/[propertyId]" />
                <Stack.Screen name="checkout/confirmation" />
                <Stack.Screen name="chat/[conversationId]" />
                <Stack.Screen name="account/profile" />
                <Stack.Screen name="account/wallet" />
                <Stack.Screen name="account/payment-methods" />
                <Stack.Screen name="account/faq" />
                <Stack.Screen name="account/terms" />
                <Stack.Screen name="account/privacy" />
                <Stack.Screen name="account/notifications" />
              </>
            )}
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
