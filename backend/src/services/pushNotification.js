/**
 * Push Notification Service
 * Uses Firebase Cloud Messaging (FCM) for both Android and iOS
 */

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

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    console.log(`[Push] Would send: "${title}" - "${body}" to ${deviceTokens.length} device(s)`);
    return;
  }

  const tokens = deviceTokens.map((dt) => dt.token).filter(Boolean);
  if (tokens.length === 0) return;

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
        console.log(`[Push] Removing ${invalidTokens.length} invalid token(s)`);
        // Caller should handle removing invalid tokens from User.deviceTokens
        return { success: true, invalidTokens };
      }
    }

    return { success: true, successCount: response.successCount };
  } catch (error) {
    console.error('[Push] Send error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPush };
