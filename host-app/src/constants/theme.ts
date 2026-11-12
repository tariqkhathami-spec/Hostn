import { Platform } from 'react-native';
import { I18nManager } from 'react-native';

export const Colors = {
  // Primary purple palette (matching web frontend)
  primary: '#14644b',
  primary50: '#eefaf4',
  primary100: '#d6f3e4',
  primary200: '#b0e6cc',
  primary300: '#7dd2ae',
  primary400: '#48b78c',
  primary500: '#259c73',
  primary600: '#177d5c',
  primary700: '#14644b',
  primary800: '#124f3d',
  primary900: '#0f4133',
  primary950: '#06231b',

  // Gold accent
  gold: '#f08c0a',
  gold50: '#fff9eb',
  gold100: '#feefc7',
  gold400: '#fbad24',
  gold500: '#f08c0a',

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

// The side a line of text starts on: the right in Arabic, the left in English.
// iOS mirrors textAlign on <Text> in a right-to-left layout and Android does
// not, so the literal differs by platform. iOS also aligns unstyled text by
// the PHONE's language rather than the app's, so every text style below
// states its alignment — otherwise Arabic headings hug the left edge on an
// iPhone that is set to English.
export const TEXT_START: 'left' | 'right' =
  Platform.OS === 'android' && I18nManager.isRTL ? 'right' : 'left';

// The opposite side: where a trailing value ends (the left in Arabic).
export const TEXT_END: 'left' | 'right' =
  Platform.OS === 'android' && I18nManager.isRTL ? 'left' : 'right';

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, textAlign: TEXT_START },
  h2: { fontSize: 24, fontWeight: '700' as const, textAlign: TEXT_START },
  h3: { fontSize: 20, fontWeight: '600' as const, textAlign: TEXT_START },
  subtitle: { fontSize: 18, fontWeight: '600' as const, textAlign: TEXT_START },
  body: { fontSize: 16, fontWeight: '400' as const, textAlign: TEXT_START },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, textAlign: TEXT_START },
  small: { fontSize: 14, fontWeight: '400' as const, textAlign: TEXT_START },
  smallBold: { fontSize: 14, fontWeight: '600' as const, textAlign: TEXT_START },
  caption: { fontSize: 12, fontWeight: '400' as const, textAlign: TEXT_START },
  tiny: { fontSize: 10, fontWeight: '400' as const, textAlign: TEXT_START },
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

// Layout rules for a right-to-left app
// ------------------------------------
// With isRTL on, React Native mirrors the layout itself: a 'row' starts at the
// right, 'flex-start' is the right edge, and start/end (marginStart,
// paddingEnd, start, end …) follow the reading direction. So screens are
// written in READING order — the first child of a row is the one the eye
// meets first (the icon or label), the last is the trailing value / chevron —
// with plain 'row' and 'flex-start'. Do not use 'row-reverse', 'flex-end',
// left/right or textAlign 'right' to mean "the Arabic side": they are
// mirrored a second time and end up on the wrong side.
//
// Icons that point somewhere are not mirrored by the layout, so pick them
// here instead of hard-coding a glyph:
//   back    — the header "go back" control (points to where the screen came from)
//   forward — a row that opens another screen, "next", "see all"
// For a glyph that has no mirrored twin (e.g. the "send" paper plane): add this
// to the icon's style so it points along the reading direction.
export const MIRROR_IN_RTL = isRTL ? ({ transform: [{ scaleX: -1 }] } as const) : undefined;

export const DirectionalIcon = {
  back: isRTL ? 'chevron-forward' : 'chevron-back',
  forward: isRTL ? 'chevron-back' : 'chevron-forward',
  arrowBack: isRTL ? 'arrow-forward' : 'arrow-back',
  arrowForward: isRTL ? 'arrow-back' : 'arrow-forward',
} as const;

