import type { APIRoute } from 'astro';
import { SITE_URL } from '@/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { allCollections } from '@/lib/server/collections';
import { urlsetXml } from '@/lib/server/sitemap';
import { allMeters, allRhymes, allThemes } from '@/lib/server/taxonomies';
import { poetsUrl, taxonomyIndexUrl, taxonomyUrl } from '@/lib/urls';

export const GET: APIRoute = async () => {
  const [meters, rhymes, themes, collections] = await Promise.all([
    allMeters(),
    allRhymes(),
    allThemes(),
    allCollections(),
  ]);
  const locs = [
    `${SITE_URL}/`,
    `${SITE_URL}${taxonomyIndexUrl('meters')}`,
    `${SITE_URL}${taxonomyIndexUrl('rhymes')}`,
    `${SITE_URL}${taxonomyIndexUrl('themes')}`,
    `${SITE_URL}${taxonomyIndexUrl('collections')}`,
    `${SITE_URL}${poetsUrl()}`,
    ...meters.map((m) => `${SITE_URL}${taxonomyUrl('meters', m.slug)}`),
    ...rhymes.map((r) => `${SITE_URL}${taxonomyUrl('rhymes', r.slug)}`),
    ...themes.map((t) => `${SITE_URL}${taxonomyUrl('themes', t.slug)}`),
    ...collections.map((c) => `${SITE_URL}${taxonomyUrl('collections', c.slug)}`),
  ];
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
