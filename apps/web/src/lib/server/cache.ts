const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function cacheControl(maxAgeSeconds: number, swrSeconds: number): string {
  return `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${swrSeconds}`;
}

export const CACHE_POEM = cacheControl(DAY, 7 * DAY);
export const CACHE_LIST = cacheControl(HOUR, DAY);
export const CACHE_INDEX = cacheControl(HOUR, DAY);
export const CACHE_SITEMAP = cacheControl(DAY, 7 * DAY);
export const CACHE_NONE = 'no-store';
