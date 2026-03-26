export const Colors = {
  primary: '#4B0082',
  primaryLight: '#6B2FA0',
  primaryDark: '#35005C',
  accent: '#FF6B00',
  accentLight: '#FF8A33',

  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceAlt: '#FAFAFA',

  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textLight: '#BBBBBB',
  textWhite: '#FFFFFF',

  border: '#E5E5E5',
  borderLight: '#F0F0F0',

  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',

  heart: '#FF4458',
  star: '#FFB800',

  messageSent: '#4B0082',
  messageReceived: '#F0F0F0',

  skeleton: '#E8E8E8',
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
  md: 10,
  card: 12,
  lg: 16,
  pill: 20,
  bottomSheet: 20,
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
  caption: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '400' as const },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    shadowColor: '#4B0082',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
