import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../store/authStore';

// EAS project the Expo push token is issued for. Read from the app config
// (app.json -> extra.eas.projectId); the literal is the same id, kept for
// builds where the config is not available at runtime.
const FALLBACK_PROJECT_ID = 'c51f62f8-e674-402f-ba85-2fa0aa4b06e6';
const projectId: string =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? FALLBACK_PROJECT_ID;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const asId = (value: unknown): string | null =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) ? value : null;

/**
 * Screen to open for a tapped push. The server sends
 * data: { type, bookingId?, conversationId?, ticketId?, notificationId },
 * where `type` is the Notification model's type.
 */
export function notificationTarget(data: Record<string, unknown> | null | undefined): Href {
  const type = typeof data?.type === 'string' ? data.type : '';
  const bookingId = asId(data?.bookingId);
  const conversationId = asId(data?.conversationId);
  const ticketId = asId(data?.ticketId);

  switch (type) {
    case 'booking_created':
    case 'booking_confirmed':
    case 'booking_rejected':
    case 'booking_cancelled':
    case 'booking_completed':
    case 'payment_success':
    case 'payment_failed':
      // The booking itself when the push names it, else the bookings tab.
      return bookingId ? (`/booking/${bookingId}` as Href) : '/(tabs)/bookings';
    case 'new_message':
      return conversationId ? (`/chat/${conversationId}?c=1` as Href) : '/(tabs)/conversations';
    case 'support_reply':
      return ticketId ? (`/account/ticket/${ticketId}` as Href) : '/account/support';
    // review_received, listing_approved, listing_rejected (host side),
    // report_update and system have no screen of their own in this app.
    default:
      return '/account/notifications';
  }
}

// A tap is delivered both as the "last response" (when it opened the app) and
// to the listener; each one is handled once.
let lastHandledResponseId: string | null = null;

export function useNotificationSetup() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    const open = (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (responseId && responseId === lastHandledResponseId) return;
      lastHandledResponseId = responseId;
      try {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        router.push(notificationTarget(data));
        // So the same tap is not replayed on the next launch or sign-in.
        Notifications.clearLastNotificationResponse();
      } catch {
        // Never let a malformed push break the app.
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(open);

    // The tap that launched the app arrives before this listener exists.
    try {
      open(Notifications.getLastNotificationResponse());
    } catch {
      // Not available (e.g. web): nothing to open.
    }

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);
}

// Stays silent when it cannot register (simulator, permission refused,
// offline): push is optional and the app works without it.
async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'android') {
      // The channel must exist before a token is requested on Android 13+.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsService.registerPushToken(tokenData.data);
  } catch (error) {
    if (__DEV__) console.debug('[push] registration skipped:', error);
  }
}
