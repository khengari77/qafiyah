import type { APIRoute } from 'astro';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { SITEMAP_POEMS_PER_SHARD, shardCount, sitemapIndexXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const slugs = await apiServer.poems.listPoemSlugs();
  const poemShards = shardCount(slugs.data.length, SITEMAP_POEMS_PER_SHARD);
  const paths = [
    ...Array.from({ length: poemShards }, (_, i) => `/sitemap/poems/${i + 1}.xml`),
    '/sitemap/poets.xml',
    '/sitemap/taxonomies.xml',
    '/sitemap/collections.xml',
  ];
  return new Response(sitemapIndexXml(paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
