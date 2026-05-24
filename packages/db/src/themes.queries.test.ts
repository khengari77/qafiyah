import { describe, expect, it, vi } from 'vitest';
import { asThemeSlug } from './brand';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';
import { listAllThemePoems, listThemePoems, listThemes } from './themes.queries';

describe('listThemes', () => {
  it('returns themes sorted by poemsCount descending', async () => {
    const rows = [
      { name: 'رثاء', slug: 'ritha', poemsCount: 10 },
      { name: 'غزل', slug: 'ghazal', poemsCount: 50 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listThemes(mockDb))._unsafeUnwrap();
    expect(value[0]?.name).toBe('غزل');
    expect(value[1]?.name).toBe('رثاء');
  });

  it('returns empty array when no themes exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listThemes(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listThemePoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'غزل', poems_count: 40 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'abcd',
      poet_name: 'شاعر',
      poet_slug: 'poet-a',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listThemePoems(mockDb, asThemeSlug('ghazal'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent.name).toBe('غزل');
    expect(value.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns not_found err when theme is not found', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listThemePoems(mockDb, asThemeSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });
});

describe('listAllThemePoems', () => {
  it('returns a Map keyed by theme slug containing all poems for that theme', async () => {
    await withTestDb(async (db) => {
      const result = await listAllThemePoems(db);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      const map = result.value;
      expect(map.size).toBeGreaterThan(0);
      for (const [, poems] of map) {
        expect(poems.length).toBeGreaterThan(0);
        expect(poems[0]).toMatchObject({
          title: expect.any(String),
          slug: expect.any(String),
          poetName: expect.any(String),
          poetSlug: expect.any(String),
          meterName: expect.any(String),
          meterSlug: expect.any(String),
        });
      }
    });
  });
});
