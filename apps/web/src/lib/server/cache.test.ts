import { describe, expect, it } from 'vitest';
import {
  CACHE_INDEX,
  CACHE_LIST,
  CACHE_NONE,
  CACHE_POEM,
  CACHE_SITEMAP,
  cacheControl,
} from './cache';

describe('cacheControl', () => {
  it('formats max-age + stale-while-revalidate', () => {
    expect(cacheControl(3600, 86400)).toBe('public, max-age=3600, stale-while-revalidate=86400');
  });
});

describe('cache constants', () => {
  it('poems cache 24h / SWR 7d', () => {
    expect(CACHE_POEM).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });
  it('lists and indexes cache 1h / SWR 24h', () => {
    expect(CACHE_LIST).toBe('public, max-age=3600, stale-while-revalidate=86400');
    expect(CACHE_INDEX).toBe('public, max-age=3600, stale-while-revalidate=86400');
  });
  it('sitemap cache 24h / SWR 7d', () => {
    expect(CACHE_SITEMAP).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });
  it('404 is uncacheable', () => {
    expect(CACHE_NONE).toBe('no-store');
  });
});
