import { describe, expect, it, vi } from 'vitest';
import { asEraSlug } from './brand';
import { getEraBySlug, listEras } from './eras.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listEras', () => {
  it('returns rows in DB order (sort_order delegated to DB)', async () => {
    const rows = [
      { name: 'جاهلي', slug: 'jahili', poetsCount: 5, poemsCount: 50 },
      { name: 'عباسي', slug: 'abbasi', poetsCount: 10, poemsCount: 100 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listEras(mockDb))._unsafeUnwrap();
    expect(value[0]?.name).toBe('جاهلي');
    expect(value[1]?.name).toBe('عباسي');
  });

  it('returns empty array when no eras exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listEras(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('getEraBySlug (integration)', () => {
  it('returns the matching era stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getEraBySlug(db, asEraSlug('islami'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('islami');
      expect(typeof result.value.name).toBe('string');
      expect(result.value.poemsCount).toBeGreaterThan(0);
      expect(typeof result.value.poetsCount).toBe('number');
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getEraBySlug(db, asEraSlug('not-a-real-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
