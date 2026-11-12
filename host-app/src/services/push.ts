import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';
import { t } from '../utils/i18n';

// Same id as `extra.eas.projectId` in app.json; used when the manifest is not
// available at runtime.
const FALLBACK_PROJECT_ID = 'd1995890-c14c-4714-9f12-80b6a3b5561a';

// The Expo push token last registered with the server for the signed-in host,
// kept so sign-out can remove it.
let registeredToken: string | null = null;

// Fails silently: there is no push token on a simulator, and the host may
// refuse the permission.
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // Android needs a channel before it can show the permission prompt.
      await Notifications.setNotificationChannelAsync('default', {
        name: t('notifications.title'),
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

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      FALLBACK_PROJECT_ID;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/notifications/device-token', {
      token: tokenData.data,
      platform: Platform.OS,
    });
    registeredToken = tokenData.data;
  } catch {
    // No push on this device; the in-app notifications list still works.
  }
}

// Called on sign-out, while the auth token is still stored, so this phone
// stops receiving the account's notifications.
export async function unregisterPushToken(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  try {
    await api.delete('/notifications/device-token', { data: { token }, timeout: 5000 });
  } catch {
    // Signing out must not depend on this.
  }
}
