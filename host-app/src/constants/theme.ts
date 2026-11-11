import { Platform } from 'react-native';
import { I18nManager } from 'react-native';

export const Colors = {
  // Primary purple palette (matching web frontend)
  primary: '#6d28d9',
  primary50: '#faf8ff',
  primary100: '#f3edff',
  primary200: '#e8dffe',
  primary300: '#d4c4fc',
  primary400: '#b794f6',
  primary500: '#9461e5',
  primary600: '#7c3aed',
  primary700: '#6d28d9',
  primary800: '#5521a5',
  primary900: '#3b1578',
  primary950: '#1e0a3e',

  // Gold accent
  gold: '#d4af37',
  gold50: '#fefdf4',
  gold100: '#fdf8e1',
  gold400: '#e8c94a',
  gold500: '#d4af37',

  // Status
  success: '#059669',
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Booking status
  statusConfirmed: '#059669',
  statusPayment: '#3b82f6',
  statusWaiting: '#f59e0b',
  statusCancelled: '#dc2626',
  statusNoShow: '#9ca3af',

  // Neutrals
  white: '#ffffff',
  black: '#1a1a1a',
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceAlt: '#f3f4f6',

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textWhite: '#ffffff',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  divider: '#f0f0f0',

  skeleton: '#e5e7eb',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  smallBold: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '400' as const },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  bottomBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const isRTL = I18nManager.isRTL;

// Aligns text to the reading-start side (the right, in this Arabic app).
// iOS mirrors textAlign on <Text> in a right-to-left layout and Android does
// not, so a literal 'right' ends up on the left on iPhone.
export const TEXT_START: 'left' | 'right' = Platform.OS === 'ios' ? 'left' : 'right';
