interface LogoProps {
  /** `dark` text for light backgrounds, `light` text for dark backgrounds. */
  tone?: 'dark' | 'light';
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * Hostn brand mark: a lowercase "h" drawn as a doorway arch, with a small
 * amber sun over it — an open door to a stay.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hostn-mark-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1b8a66" />
          <stop offset="1" stopColor="#0f4133" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#hostn-mark-bg)" />
      <path
        d="M13 9v21M13 22a7 7 0 0 1 14 0v8"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27.5" cy="10.5" r="2.7" fill="#fbad24" />
    </svg>
  );
}

export default function Logo({ tone = 'dark', size = 36, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} dir="ltr">
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-extrabold tracking-tight leading-none ${tone === 'light' ? 'text-white' : 'text-primary-950'}`}
          style={{ fontFamily: "'Rubik', system-ui, sans-serif", fontSize: size * 0.66 }}
        >
          Hostn
        </span>
      )}
    </span>
  );
}
