import { I18nManager } from 'react-native';

export const Colors = {
  primary: '#4B0082',
  primary50: '#f5f0ff',
  primary100: '#ede5ff',
  primary200: '#d9c7ff',
  primary300: '#b794f6',
  primary400: '#9461e5',
  primary500: '#7c3aed',
  primary600: '#6d28d9',
  primary700: '#4B0082',
  primary800: '#3b0066',
  primary900: '#2a004a',
  primary950: '#1a002e',

  accent: '#FF6B00',
  accent50: '#fff8f0',
  accent100: '#ffedd5',
  accent400: '#ff8c33',
  accent500: '#FF6B00',

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
