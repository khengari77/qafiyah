import { PROD_SITE_URL } from '@qafiyah/constants';

export function shardCount(total: number, perShard: number): number {
  return Math.max(1, Math.ceil(total / perShard));
}

// Slugs are URL-safe (lowercase ASCII + hyphens), so no XML entity escaping is required.
export function urlsetXml(locs: readonly string[]): string {
  const body = locs.map((loc) => `<url><loc>${loc}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapIndexXml(sitemapPaths: readonly string[]): string {
  const body = sitemapPaths
    .map((path) => `<sitemap><loc>${PROD_SITE_URL}${path}</loc></sitemap>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
