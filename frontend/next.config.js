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
    ],
    // Optimize images for Vercel
    formats: ['image/avif', 'image/webp'],
  },
  // Strict TypeScript checking in production - do NOT ignore build errors
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // Production optimizations for Vercel serverless
  swcMinify: true,
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
};

module.exports = nextConfig;
