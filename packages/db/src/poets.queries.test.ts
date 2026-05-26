import { describe, expect, it, vi } from 'vitest';
import { asPoetSlug } from './brand';
import { getPoetBySlug, listPoets } from './poets.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listPoets', () => {
  it('returns poets with pagination info', async () => {
    const poetRows = [{ name: 'المتنبي', slug: 'al-mutanabbi', poemsCount: 200 }];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(poetRows)) }),
      $count: vi.fn().mockResolvedValue(1),
    });

    const value = (await listPoets(mockDb, 1))._unsafeUnwrap();
    expect(value.poets[0]?.name).toBe('المتنبي');
    expect(value.total).toBe(1);
    expect(value.totalPages).toBe(1);
  });

  it('returns empty list when no poets exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
      $count: vi.fn().mockResolvedValue(0),
    });

    const value = (await listPoets(mockDb, 1))._unsafeUnwrap();
    expect(value.poets).toEqual([]);
    expect(value.total).toBe(0);
    expect(value.totalPages).toBe(0);
  });
});

describe('getPoetBySlug (integration)', () => {
  it('returns the matching poet stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getPoetBySlug(db, asPoetSlug('alasha'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('alasha');
      expect(typeof result.value.name).toBe('string');
      expect(result.value.poemsCount).toBeGreaterThan(0);
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getPoetBySlug(db, asPoetSlug('not-a-real-poet-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
