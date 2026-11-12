// When NEXT_PUBLIC_API_URL is an absolute URL (local development against a
// backend on another port), allow that origin — and its WebSocket twin — in the
// CSP. In production the API URL is relative ('/api/v1'), so nothing is added.
const apiConnectSources = (() => {
  try {
    const { origin } = new URL(process.env.NEXT_PUBLIC_API_URL);
    return [origin, origin.replace(/^http/, 'ws')];
  } catch {
    return [];
  }
})();

// The realtime (Socket.IO) server is the API host itself; browsers connect to
// it directly because the same-origin API proxy cannot carry WebSockets.
const socketConnectSources = (() => {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://hostn-production.up.railway.app';
  try {
    const { origin } = new URL(url);
    return [origin, origin.replace(/^http/, 'ws')];
  } catch {
    return [];
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
    // Optimize images for Vercel
    formats: ['image/avif', 'image/webp'],
  },
  // Strict TypeScript checking in production - do NOT ignore build errors
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // Production optimizations for Vercel serverless
  compress: true,
  productionBrowserSourceMaps: false,
  // Environment variable validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Hostn',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Vercel-specific optimizations
  experimental: {
    // Enable turbopack for faster builds (optional, requires Next.js 14+)
    // turbopack: true,
  },

  // ── Local API proxy (development only) ──
  // Production serves the API same-origin through vercel.json rewrites. Set
  // API_PROXY_TARGET (e.g. http://localhost:5050) with NEXT_PUBLIC_API_URL=/api/v1
  // to get the same behaviour locally, so auth cookies work on the
  // business.localhost / admin.localhost subdomains too.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [
      { source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` },
      { source: '/health', destination: `${target}/health` },
    ];
  },

  // ── Redirects for clean URLs ──
  async redirects() {
    return [
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/terms', destination: '/terms-of-use', permanent: true },
    ];
  },

  // ── Security Headers ──
  // Protects against XSS, clickjacking, MIME sniffing, and other attack vectors
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.moyasar.com https://cdnjs.cloudflare.com https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.moyasar.com",
              "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com https://api.dicebear.com https://cdn.moyasar.com https://maps.googleapis.com https://maps.gstatic.com https://*.ggpht.com https://*.amazonaws.com https://*.cloudfront.net",
              `connect-src 'self' http://localhost:5000 http://localhost:5050 ws://localhost:5050 ${apiConnectSources.join(' ')} ${socketConnectSources.join(' ')} https://api.moyasar.com https://*.mongodb.net https://maps.googleapis.com`.replace(/\s+/g, ' '),
              "frame-src 'self' https://cdn.moyasar.com https://api.moyasar.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://api.moyasar.com",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
