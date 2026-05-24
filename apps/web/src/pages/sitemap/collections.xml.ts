import { PROD_SITE_URL } from '@qafiyah/constants';
import type { APIRoute } from 'astro';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { allCollections } from '@/lib/server/collections';
import { urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const collections = await allCollections();
  const locs = [
    `${PROD_SITE_URL}/collections`,
    ...collections.map((c) => `${PROD_SITE_URL}/collections/${c.slug}/page/1`),
  ];
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
