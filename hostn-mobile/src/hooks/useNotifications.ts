import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification displayed automatically by handler above
      }
    );

    // Handle notification tap (user interaction)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        navigateFromNotification(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const projectId = Constants.default.expoConfig?.extra?.eas?.projectId;
      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await authService.registerDeviceToken(token, platform);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    } catch (error) {
      console.log('[Notifications] Registration error:', error);
    }
  };

  const navigateFromNotification = (data: Record<string, any>) => {
    if (!data) return;

    switch (data.type) {
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_pending':
        router.push('/(tabs)/bookings');
        break;
      case 'new_message':
        if (data.conversationId) {
          router.push(`/chat/${data.conversationId}`);
        } else {
          router.push('/(tabs)/conversations');
        }
        break;
      case 'new_review':
        if (data.propertyId) {
          router.push(`/listing/${data.propertyId}`);
        }
        break;
      default:
        router.push('/account/notifications');
    }
  };
}
