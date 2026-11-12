import { I18nManager } from 'react-native';

export const Colors = {
  // Hostn identity: emerald primary, amber accent.
  primary: '#14644b',
  primary50: '#eefaf4',
  primary100: '#d6f3e4',
  primary200: '#b0e5cb',
  primary300: '#7ccfa9',
  primary400: '#48b78c',
  primary500: '#177d5c',
  primary600: '#14644b',
  primary700: '#14644b',
  primary800: '#0f4133',
  primary900: '#0a3026',
  primary950: '#06231b',

  accent: '#f08c0a',
  accent50: '#fff8eb',
  accent100: '#feefc7',
  accent400: '#fbad24',
  accent500: '#f08c0a',

  success: '#059669',
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',

  statusConfirmed: '#059669',
  statusPending: '#f59e0b',
  statusCancelled: '#dc2626',

  white: '#ffffff',
  black: '#1a1a1a',
  background: '#ffffff',
  surface: '#F5F5F5',
  surfaceAlt: '#f3f4f6',

  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textTertiary: '#9ca3af',
  textWhite: '#ffffff',

  border: '#E5E7EB',
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
// "Back" points towards where the previous screen came from: left in
// left-to-right layouts, right in Arabic.
export const BACK_ICON = I18nManager.isRTL ? 'arrow-forward' : 'arrow-back';
export const FORWARD_ICON = I18nManager.isRTL ? 'arrow-back' : 'arrow-forward';
