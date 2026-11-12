import type { MetadataRoute } from 'next';

const SITE = 'https://hostn.co';
const API = process.env.SITEMAP_API_URL || 'https://hostn-production.up.railway.app/api/v1';

// Rebuilt at most once an hour so new listings reach search engines quickly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/terms-of-use`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Every public unit gets its own entry. If the API is unreachable the
  // sitemap still lists the fixed pages.
  try {
    const res = await fetch(`${API}/units/search?limit=50&page=1`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const body = (await res.json()) as { data?: Array<{ _id: string; updatedAt?: string }> };
      for (const unit of body.data || []) {
        pages.push({
          url: `${SITE}/search/${unit._id}`,
          lastModified: unit.updatedAt ? new Date(unit.updatedAt) : now,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // keep the static entries
  }

  return pages;
}
