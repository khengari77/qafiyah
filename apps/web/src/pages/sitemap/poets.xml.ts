import { PROD_SITE_URL } from '@qafiyah/constants';
import type { APIRoute } from 'astro';
import { CAT_POET_PREFIX_REGEX } from '@/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { getPoetsPage } from '@/lib/server/poets';
import { urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const locs: string[] = [];
  // Poets are in the low thousands → a handful of 30-item pages. Cached 24h.
  // Reuses getPoetsPage, which returns null when the page is past the last (404).
  let page = 1;
  while (true) {
    const result = await getPoetsPage(page);
    if (!result) break;
    for (const poet of result.poets) {
      const slug = String(poet.slug).toLowerCase().replace(CAT_POET_PREFIX_REGEX, '');
      locs.push(`${PROD_SITE_URL}/poets/${slug}/page/1`);
    }
    if (page >= result.pagination.totalPages) break;
    page += 1;
  }
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
