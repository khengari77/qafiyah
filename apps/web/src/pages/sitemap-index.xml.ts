import { SITEMAP_POEMS_PER_SHARD } from '@qafiyah/constants';
import type { APIRoute } from 'astro';
import { SITE_URL } from '@/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { shardCount, sitemapIndexXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const { data } = await apiServer.poems.count();
  const poemShards = shardCount(data.total, SITEMAP_POEMS_PER_SHARD);
  const paths = [
    ...Array.from({ length: poemShards }, (_, i) => `/sitemap/poems/${i + 1}.xml`),
    '/sitemap/poets.xml',
    '/sitemap/taxonomies.xml',
  ];
  return new Response(sitemapIndexXml(SITE_URL, paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
