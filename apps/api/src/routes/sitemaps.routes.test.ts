/**
 * Tests for sitemaps routes
 */

import { describe, expect, it, vi } from 'vitest';
import { MAX_URLS_PER_SITEMAP } from '../constants';
import { createMockDb, createTestClient } from '../test-utils/test-helpers';
import sitemaps from './sitemaps.routes';

describe('sitemaps routes', () => {
  it('should return sitemap index XML', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ count: 5000 }]),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    const text = await res.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<sitemapindex');
  });

  it('should return main sitemap XML', async () => {
    const client = createTestClient(sitemaps);

    const res = await client.$get('/main');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    const text = await res.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<urlset');
  });

  it('should return poets sitemap XML', async () => {
    const mockPoets = [
      {
        id: 1,
        name: 'Poet 1',
        slug: 'poet-1',
        poemsCount: 50,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockPoets),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/poets');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    const text = await res.text();
    expect(text).toContain('<?xml');
  });

  it('should return eras sitemap XML', async () => {
    const mockEras = [
      {
        id: 1,
        name: 'Era 1',
        slug: 'era-1',
        poetsCount: 50,
        poemsCount: 100,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockEras),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/eras');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
  });

  it('should return meters sitemap XML', async () => {
    const mockMeters = [
      {
        id: 1,
        name: 'Meter 1',
        slug: 'meter-1',
        poemsCount: 100,
        poetsCount: 50,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockMeters),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/meters');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
  });

  it('should return rhymes sitemap XML', async () => {
    const mockRhymes = [
      {
        id: 1,
        pattern: 'ا',
        slug: 'rhyme-1',
        poemsCount: 100,
        poetsCount: 50,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockRhymes),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/rhymes');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
  });

  it('should return themes sitemap XML', async () => {
    const mockThemes = [
      {
        id: 1,
        name: 'Theme 1',
        slug: 'theme-1',
        poemsCount: 100,
        poetsCount: 50,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockThemes),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/themes');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
  });

  it('should return paginated poems sitemap XML', async () => {
    const mockPoems = Array.from({ length: MAX_URLS_PER_SITEMAP }, (_, i) => ({
      slug: `poem-${i}`,
      title: `Poem ${i}`,
    }));

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(mockPoems),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(sitemaps, { db });

    const res = await client.$get('/poems/1');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    const text = await res.text();
    expect(text).toContain('<?xml');
  });
});
