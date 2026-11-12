import type { MetadataRoute } from 'next';

const SITE = 'https://hostn.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private areas and the API are not for search engines.
        disallow: ['/api/', '/dashboard', '/booking', '/auth', '/host', '/admin', '/callback'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
