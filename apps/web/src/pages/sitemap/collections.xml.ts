import { PROD_SITE_URL } from '@qafiyah/constants';
import type { APIRoute } from 'astro';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { allEras, allMeters, allRhymes, allThemes } from '@/lib/server/collections';
import { urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const [eras, meters, rhymes, themes] = await Promise.all([
    allEras(),
    allMeters(),
    allRhymes(),
    allThemes(),
  ]);
  const locs = [
    `${PROD_SITE_URL}/`,
    `${PROD_SITE_URL}/eras`,
    `${PROD_SITE_URL}/meters`,
    `${PROD_SITE_URL}/rhymes`,
    `${PROD_SITE_URL}/themes`,
    `${PROD_SITE_URL}/poets/page/1`,
    ...eras.map((e) => `${PROD_SITE_URL}/eras/${e.slug}/page/1`),
    ...meters.map((m) => `${PROD_SITE_URL}/meters/${m.slug}/page/1`),
    ...rhymes.map((r) => `${PROD_SITE_URL}/rhymes/${r.slug}/page/1`),
    ...themes.map((t) => `${PROD_SITE_URL}/themes/${t.slug}/page/1`),
  ];
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
