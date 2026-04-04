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
              "img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com https://api.dicebear.com https://cdn.moyasar.com https://maps.googleapis.com https://maps.gstatic.com https://*.ggpht.com",
              "connect-src 'self' http://localhost:5000 https://api.moyasar.com https://*.mongodb.net https://maps.googleapis.com",
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
