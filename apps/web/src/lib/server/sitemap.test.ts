import { SITEMAP_POEMS_PER_SHARD } from '@qafiyah/constants';
import { describe, expect, it } from 'vitest';
import { shardCount, sitemapIndexXml, urlsetXml } from './sitemap';

describe('urlsetXml', () => {
  it('wraps locs in a urlset', () => {
    const xml = urlsetXml(['https://qafiyah.com/poems/a', 'https://qafiyah.com/poems/b']);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<url><loc>https://qafiyah.com/poems/a</loc></url>');
    expect(xml).toContain('<url><loc>https://qafiyah.com/poems/b</loc></url>');
  });
});

describe('sitemapIndexXml', () => {
  it('lists child sitemap URLs under PROD_SITE_URL', () => {
    const xml = sitemapIndexXml(['/sitemap/poems/1.xml', '/sitemap/poets.xml']);
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('<sitemap><loc>https://qafiyah.com/sitemap/poems/1.xml</loc></sitemap>');
    expect(xml).toContain('<sitemap><loc>https://qafiyah.com/sitemap/poets.xml</loc></sitemap>');
  });
});

describe('shardCount', () => {
  it('is at least 1', () => expect(shardCount(0, SITEMAP_POEMS_PER_SHARD)).toBe(1));
  it('ceils to the shard size', () => {
    expect(shardCount(SITEMAP_POEMS_PER_SHARD, SITEMAP_POEMS_PER_SHARD)).toBe(1);
    expect(shardCount(SITEMAP_POEMS_PER_SHARD + 1, SITEMAP_POEMS_PER_SHARD)).toBe(2);
  });
});
