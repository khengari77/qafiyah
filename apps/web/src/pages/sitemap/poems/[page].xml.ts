import { PROD_SITE_URL } from '@qafiyah/constants';
import type { APIRoute } from 'astro';
import { parsePageParam } from '@/lib/page-numbers';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { SITEMAP_POEMS_PER_SHARD, urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async ({ params }) => {
  const page = parsePageParam(params['page']);
  if (page === null) return new Response('Not found', { status: 404 });
  const slugs = await apiServer.poems.listSlugs();
  const start = (page - 1) * SITEMAP_POEMS_PER_SHARD;
  const slice = slugs.data.slice(start, start + SITEMAP_POEMS_PER_SHARD);
  if (slice.length === 0) return new Response('Not found', { status: 404 });
  const locs = slice.map((slug) => `${PROD_SITE_URL}/poems/${slug}`);
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
