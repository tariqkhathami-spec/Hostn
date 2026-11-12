/**
 * Push Notification Service
 *
 * The mobile apps register Expo push tokens ("ExponentPushToken[...]"), so
 * those go through the Expo push service. Any other token is treated as a raw
 * FCM token and sent through Firebase when FIREBASE_SERVICE_ACCOUNT is set.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const isExpoToken = (t) => /^Expo(nent)?PushToken\[.+\]$/.test(String(t || ''));

/**
 * Send through the Expo push service.
 * @returns {{ sent: number, invalidTokens: string[] }}
 */
const sendExpoPush = async (tokens, { title, body, data = {} }) => {
  const invalidTokens = [];
  let sent = 0;
  // Expo accepts at most 100 messages per request.
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        batch.map((to) => ({ to, title, body, data, sound: 'default', channelId: 'default', priority: 'high' }))
      ),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    const tickets = Array.isArray(json.data) ? json.data : [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'ok') sent += 1;
      else if (ticket.details && ticket.details.error === 'DeviceNotRegistered') invalidTokens.push(batch[idx]);
    });
    if (!res.ok) console.error('[Push] Expo push service responded', res.status);
  }
  return { sent, invalidTokens };
};

let admin = null;

const getFirebaseAdmin = () => {
  if (admin) return admin;

  try {
    admin = require('firebase-admin');

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn('[Push] No FIREBASE_SERVICE_ACCOUNT configured. Push notifications disabled.');
      return null;
    }

    return admin;
  } catch (error) {
    console.error('[Push] Firebase initialization error:', error.message);
    return null;
  }
};

/**
 * Send push notification to device tokens
 * @param {Array<{token: string, platform: string}>} deviceTokens
 * @param {Object} notification - { title, body, data }
 */
const sendPush = async (deviceTokens, { title, body, data = {} }) => {
  if (!deviceTokens || deviceTokens.length === 0) return;

  const allTokens = [...new Set(deviceTokens.map((dt) => dt.token).filter(Boolean))];
  const expoTokens = allTokens.filter(isExpoToken);
  const tokens = allTokens.filter((t) => !isExpoToken(t));

  let expoResult = { sent: 0, invalidTokens: [] };
  if (expoTokens.length > 0) {
    try {
      expoResult = await sendExpoPush(expoTokens, { title, body, data });
    } catch (error) {
      console.error('[Push] Expo send error:', error.message);
    }
  }
  if (tokens.length === 0) {
    return { success: true, successCount: expoResult.sent, invalidTokens: expoResult.invalidTokens };
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return { success: true, successCount: expoResult.sent, invalidTokens: expoResult.invalidTokens };
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens,
  };

  try {
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        return {
          success: true,
          successCount: expoResult.sent + response.successCount,
          invalidTokens: [...expoResult.invalidTokens, ...invalidTokens],
        };
      }
    }

    return {
      success: true,
      successCount: expoResult.sent + response.successCount,
      invalidTokens: expoResult.invalidTokens,
    };
  } catch (error) {
    console.error('[Push] Send error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPush, isExpoToken };
