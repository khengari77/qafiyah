import { describe, expect, it, vi } from 'vitest';
import { asCollectionSlug } from './brand';
import {
  listAllCollectionPoems,
  listCollectionPoems,
  listCollections,
} from './collections.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listCollections', () => {
  it('returns collections sorted by poemsCount descending', async () => {
    const rows = [
      { name: 'الموشحات', slug: 'aa', poemsCount: 5 },
      { name: 'المعلقات', slug: 'bb', poemsCount: 10 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listCollections(mockDb))._unsafeUnwrap();
    expect(value[0]?.name).toBe('المعلقات');
    expect(value[1]?.name).toBe('الموشحات');
  });

  it('returns empty array when no collections exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listCollections(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listCollectionPoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'المعلقات', poems_count: 10 };
    const poemRow = {
      title: 'قفا نبك',
      slug: 'poem-slug',
      poet_name: 'امرؤ القيس',
      poet_slug: 'imru-l-qais',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listCollectionPoems(mockDb, asCollectionSlug('any-uuid'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent.name).toBe('المعلقات');
    expect(value.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns not_found err when collection slug is unknown', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listCollectionPoems(mockDb, asCollectionSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });
});

describe('listAllCollectionPoems', () => {
  it('returns a Map keyed by collection slug containing all poems for that collection', async () => {
    await withTestDb(async (db) => {
      const result = await listAllCollectionPoems(db);
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
