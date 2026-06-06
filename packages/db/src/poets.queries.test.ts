import { describe, expect, it, vi } from 'vitest';
import { asEraSlug, asPoetSlug } from './brand';
import { listEras } from './eras.queries';
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

  it('returns the filtered total when an era filter is passed', async () => {
    const poetRows = [{ name: 'امرؤ القيس', slug: 'imru-al-qais', poemsCount: 50 }];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(poetRows)) }),
      $count: vi.fn().mockResolvedValue(1),
    });

    const value = (await listPoets(mockDb, 1, { eraSlug: asEraSlug('jahili') }))._unsafeUnwrap();

    expect(value.poets[0]?.slug).toBe('imru-al-qais');
    expect(value.total).toBe(1);
    expect(value.totalPages).toBe(1);
  });

  it('returns rows when a name query is passed', async () => {
    const poetRows = [{ name: 'المتنبي', slug: 'al-mutanabbi', poemsCount: 200 }];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(poetRows)) }),
      $count: vi.fn().mockResolvedValue(1),
    });

    const value = (await listPoets(mockDb, 1, { q: 'متنبي' }))._unsafeUnwrap();

    expect(value.poets[0]?.slug).toBe('al-mutanabbi');
    expect(value.total).toBe(1);
  });
});

describe('listPoets era filter (integration)', () => {
  it('filtered total equals the era poetsCount stat', async () => {
    await withTestDb(async (db) => {
      const eras = (await listEras(db))._unsafeUnwrap();
      const era = eras[0];
      if (!era) return;
      const result = (await listPoets(db, 1, { eraSlug: era.slug }))._unsafeUnwrap();
      expect(result.total).toBe(era.poetsCount);
    });
  });
});

describe('listPoets name filter (integration)', () => {
  it('matches a poet name after folding diacritics and alef/ya/ta-marbuta', async () => {
    await withTestDb(async (db) => {
      const poet = (await getPoetBySlug(db, asPoetSlug('alasha')))._unsafeUnwrap();
      // Fully fold the real stored name exactly as the SQL does, then search it.
      const folded = poet.name
        .replace(/[ً-ْٰـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');

      const result = (await listPoets(db, 1, { q: folded }))._unsafeUnwrap();

      expect(result.poets.some((p) => p.slug === 'alasha')).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
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
