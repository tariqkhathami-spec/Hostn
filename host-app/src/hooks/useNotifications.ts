import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications } from '../services/push';
import { hostService } from '../services/host.service';
import { useAuthStore } from '../store/authStore';

// Show a notification that arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// What the server puts in a push: `type` is the Notification model's type.
type PushData = {
  type?: string;
  bookingId?: string;
  conversationId?: string;
  ticketId?: string;
  notificationId?: string;
};

type AppRouter = ReturnType<typeof useRouter>;

// The response that opened the app is delivered both by the listener and by
// getLastNotificationResponseAsync; handle each tap once.
let lastHandledResponseId: string | null = null;

function openFromPush(router: AppRouter, response: Notifications.NotificationResponse) {
  const request = response.notification.request;
  if (lastHandledResponseId === request.identifier) return;
  lastHandledResponseId = request.identifier;

  const data = (request.content.data ?? {}) as PushData;
  const type = typeof data.type === 'string' ? data.type : '';

  if (data.notificationId) {
    hostService.markNotificationRead(String(data.notificationId)).catch(() => {});
  }

  if (type === 'new_message' && data.conversationId) {
    router.push(`/messages/${data.conversationId}` as any);
  } else if (type === 'support_reply') {
    router.push('/messages/support' as any);
  } else if (type === 'review_received') {
    router.push('/reviews' as any);
  } else if ((type.startsWith('booking_') || type.startsWith('payment_')) && data.bookingId) {
    router.push(`/reservations/${data.bookingId}` as any);
  } else {
    router.push('/notifications' as any);
  }
}

/**
 * Registers this device for push notifications once the host is signed in and
 * opens the matching screen when a notification is tapped.
 */
export function useNotificationSetup() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromPush(router, response);
    });

    // A tap that launched the app from a closed state.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) openFromPush(router, response);
      })
      .catch(() => {});

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);
}
