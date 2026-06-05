import type { APIRoute } from 'astro';
import { SITE_URL } from '@/constants';
import { parsePageParam } from '@/lib/page-numbers';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { urlsetXml } from '@/lib/server/sitemap';
import { poemUrl } from '@/lib/urls';

export const GET: APIRoute = async ({ params }) => {
  const page = parsePageParam(params['page']);
  if (page === null) return new Response('Not found', { status: 404 });
  const { data } = await apiServer.poems.listSlugs({ page: String(page) });
  if (data.length === 0) return new Response('Not found', { status: 404 });
  const locs = data.map((slug) => `${SITE_URL}${poemUrl(slug)}`);
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
