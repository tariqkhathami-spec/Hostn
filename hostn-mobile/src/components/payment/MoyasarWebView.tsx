import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {
    // WebView not available
  }
}

export interface MoyasarPaymentConfig {
  paymentId: string;
  amount: number;
  currency: string;
  publishableKey: string;
  callbackUrl: string;
}

interface MoyasarWebViewProps {
  visible: boolean;
  paymentConfig: MoyasarPaymentConfig;
  onSuccess: (moyasarPaymentId: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
}

function buildMoyasarHTML(config: MoyasarPaymentConfig): string {
  const amountInHalalas = Math.round(config.amount * 100);

  return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Payment</title>
  <link href="https://cdn.moyasar.com/mpf/1.14.0/moyasar.css" rel="stylesheet" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #FFFFFF;
      padding: 20px 16px;
      -webkit-text-size-adjust: 100%;
    }
    .payment-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .payment-amount {
      font-size: 28px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 4px;
    }
    .payment-currency {
      font-size: 14px;
      color: #888888;
    }
    .mysr-form {
      max-width: 400px;
      margin: 0 auto;
    }
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E5E5E5;
      border-top-color: #4B0082;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-message {
      text-align: center;
      color: #F44336;
      padding: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="payment-header">
    <div class="payment-amount">${config.amount.toFixed(2)} ${config.currency}</div>
    <div class="payment-currency">Total Amount</div>
  </div>
  <div class="loading-container" id="loading">
    <div class="loading-spinner"></div>
  </div>
  <div class="mysr-form" id="moyasar-form"></div>
  <script src="https://cdn.moyasar.com/mpf/1.14.0/moyasar.js"></script>
  <script>
    (function() {
      try {
        Moyasar.init({
          element: '.mysr-form',
          amount: ${amountInHalalas},
          currency: '${config.currency}',
          description: 'Hostn Booking Payment',
          publishable_api_key: '${config.publishableKey}',
          callback_url: '${config.callbackUrl}',
          methods: ['creditcard'],
          supported_networks: ['visa', 'mastercard', 'mada'],
          on_completed: function(payment) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'payment_completed',
              id: payment.id,
              status: payment.status,
            }));
          },
          on_failure: function(error) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'payment_failed',
              error: error.message || 'Payment failed',
            }));
          },
        });
        document.getElementById('loading').style.display = 'none';
      } catch (e) {
        document.getElementById('loading').innerHTML =
          '<div class="error-message">Failed to load payment form. Please try again.</div>';
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'init_error',
          error: e.message || 'Failed to initialize payment form',
        }));
      }
    })();
  </script>
</body>
</html>`;
}

export default function MoyasarWebView({
  visible,
  paymentConfig,
  onSuccess,
  onFailure,
  onClose,
}: MoyasarWebViewProps) {
  const webViewRef = useRef<any>(null);

  const handleNavigationStateChange = useCallback(
    (navState: { url: string }) => {
      const { url } = navState;

      if (!paymentConfig.callbackUrl) return;

      // Check if Moyasar is redirecting to our callback URL
      if (url.startsWith(paymentConfig.callbackUrl)) {
        try {
          const parsedUrl = new URL(url);
          const moyasarId = parsedUrl.searchParams.get('id');
          const status = parsedUrl.searchParams.get('status');

          if (moyasarId && (status === 'paid' || status === 'initiated')) {
            onSuccess(moyasarId);
          } else {
            onFailure(status || 'Payment was not completed');
          }
        } catch {
          onFailure('Failed to parse payment response');
        }
      }
    },
    [paymentConfig.callbackUrl, onSuccess, onFailure]
  );

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);

        if (message.type === 'payment_completed') {
          if (message.status === 'paid' || message.status === 'initiated') {
            onSuccess(message.id);
          } else {
            onFailure(message.status || 'Payment was not completed');
          }
        } else if (message.type === 'payment_failed') {
          onFailure(message.error || 'Payment failed');
        } else if (message.type === 'init_error') {
          onFailure(message.error || 'Failed to initialize payment');
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [onSuccess, onFailure]
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Payment</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.webFallback}>
              <Ionicons name="phone-portrait-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.webFallbackTitle}>Use Mobile App</Text>
              <Text style={styles.webFallbackText}>
                Card payments are only available on the mobile app. Please use the iOS or Android app to complete your payment.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!WebView) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Payment</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.webFallback}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
              <Text style={styles.webFallbackTitle}>Payment Unavailable</Text>
              <Text style={styles.webFallbackText}>
                The payment module could not be loaded. Please update the app and try again.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const html = buildMoyasarHTML(paymentConfig);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment</Text>
            <View style={styles.headerSpacer} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ html }}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.webViewLoadingText}>Loading payment form...</Text>
              </View>
            )}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={(request: { url: string }) => {
              const { url } = request;
              // Allow the initial HTML load and Moyasar CDN resources
              if (
                url.startsWith('about:') ||
                url.startsWith('data:') ||
                url.includes('moyasar.com') ||
                url.includes('cdn.moyasar.com')
              ) {
                return true;
              }
              // Check if it's the callback URL redirect
              if (paymentConfig.callbackUrl && url.startsWith(paymentConfig.callbackUrl)) {
                handleNavigationStateChange({ url });
                return false;
              }
              return true;
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    marginTop: 60,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.bottomSheet,
    borderTopRightRadius: Radius.bottomSheet,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  webViewLoadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  webFallbackTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  webFallbackText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
