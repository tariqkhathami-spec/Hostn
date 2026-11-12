import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Alert, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectSocket, setQueryClient, disconnectSocket } from '../services/socket';
import { useNotificationSetup } from '../hooks/useNotifications';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

// Register queryClient with socket service so events can invalidate caches
setQueryClient(queryClient);

// Force RTL for Arabic-first app
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// An alert raised without buttons gets the system's English "OK".
// Give every such alert an Arabic button instead.
const nativeAlert = Alert.alert.bind(Alert);
Alert.alert = (title, message, buttons, options) =>
  nativeAlert(title, message, buttons && buttons.length ? buttons : [{ text: 'حسناً' }], options);

export default function RootLayout() {
  // Register for push notifications once signed in; open the right screen on tap
  useNotificationSetup();

  // A screen opened directly (deep link, notification, reload) skips the start
  // screen that loads the host's profile; fill it in so names and ids are there.
  const sessionToken = useAuthStore((s) => s.token);
  const hasHost = useAuthStore((s) => !!s.host?.name);
  useEffect(() => {
    if (!sessionToken || hasHost) return;
    let cancelled = false;
    authService
      .getOnboardingStatus()
      .then((res) => {
        const host = res?.host ?? res?.data?.host;
        if (cancelled || !host) return;
        const onboardingCompleted = host.onboardingCompleted ?? res?.data?.onboardingCompleted ?? true;
        useAuthStore.getState().setHost({ ...host, onboardingCompleted });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionToken, hasHost]);

  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    connectSocket();
    return () => { disconnectSocket(); };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Dark icons by default (most screens are light); screens with a
              coloured header switch to light icons themselves. */}
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="property" />
            <Stack.Screen name="financial" />
            <Stack.Screen name="reviews" />
            <Stack.Screen name="reservations" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="program" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="pricing" />
            <Stack.Screen name="invoices" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="legal" />
            <Stack.Screen name="permits" />
            <Stack.Screen name="protection" />
            <Stack.Screen name="suggestions" />
            <Stack.Screen name="content" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
