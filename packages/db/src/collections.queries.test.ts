import { describe, expect, it, vi } from 'vitest';
import { asCollectionSlug } from './brand';
import { getCollectionBySlug, listCollections } from './collections.queries';
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

describe('getCollectionBySlug (integration)', () => {
  it('returns the matching collection stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getCollectionBySlug(db, asCollectionSlug('almuallaqat'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('almuallaqat');
      expect(typeof result.value.name).toBe('string');
      expect(result.value.poemsCount).toBeGreaterThan(0);
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getCollectionBySlug(db, asCollectionSlug('not-a-real-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
