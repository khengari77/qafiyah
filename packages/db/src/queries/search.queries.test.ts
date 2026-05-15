/**
 * Integration tests for filter-only search against the local Postgres dump.
 * Skipped unless TEST_DATABASE_URL is provided (e.g. `bun run db:setup` then export).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDb, type DbClient } from '../client';
import { listPoemsByFilters, listPoetsByFilters, searchPoems, searchPoets } from './search.queries';

const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? '';
const skip = TEST_DATABASE_URL === '';
const describeIfDb = skip ? describe.skip : describe;

describeIfDb('filter-only search queries (integration)', () => {
  let db: DbClient;

  beforeAll(() => {
    db = createDb(TEST_DATABASE_URL);
  });

  afterAll(async () => {
    // postgres-js holds open sockets; let GC clear them after this run.
  });

  it('listPoemsByFilters: by era slug returns rows + non-zero total', async () => {
    const result = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(5);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poetEraSlug).toBe('abbasid');
      expect(row.poemTitle).toBeTypeOf('string');
      expect(row.poemSlug).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.poemMeterSlug).toBeTypeOf('string');
    }
  });

  it('listPoemsByFilters: numeric ID-string is also accepted as a slug', async () => {
    const bySlug = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const byId = await listPoemsByFilters(db, 1, null, ['2'], null, null);
    expect(byId.totalCount).toBe(bySlug.totalCount);
  });

  it('listPoemsByFilters: combining filters narrows results', async () => {
    const eraOnly = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const eraAndMeter = await listPoemsByFilters(db, 1, ['alkamil'], ['abbasid'], null, null);
    expect(eraAndMeter.totalCount).toBeLessThanOrEqual(eraOnly.totalCount);
  });

  it('listPoemsByFilters: unknown filter yields zero results', async () => {
    const result = await listPoemsByFilters(db, 1, null, ['__nonexistent__'], null, null);
    expect(result.totalCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('listPoetsByFilters: by era slug returns rows', async () => {
    const result = await listPoetsByFilters(db, 1, ['abbasid']);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(10);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poetEraSlug).toBe('abbasid');
      expect(row.poetSlug).toBeTypeOf('string');
    }
  });

  it('listPoetsByFilters: no filter returns all poets', async () => {
    const all = await listPoetsByFilters(db, 1, null);
    const filtered = await listPoetsByFilters(db, 1, ['abbasid']);
    expect(all.totalCount).toBeGreaterThanOrEqual(filtered.totalCount);
  });

  it('listPoemsByFilters: pagination', async () => {
    const page1 = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const page2 = await listPoemsByFilters(db, 2, null, ['abbasid'], null, null);
    if (page1.totalCount > 5) {
      expect(page2.rows.length).toBeGreaterThan(0);
      const page1Slugs = new Set(page1.rows.map((r) => r.poemSlug));
      for (const row of page2.rows) {
        expect(page1Slugs.has(row.poemSlug)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Mock-based unit tests (no real DB required)
// ---------------------------------------------------------------------------

const POEMS_ROW = {
  poet_name: 'المتنبي',
  poet_era: 'عباسي',
  poet_era_slug: 'abbasid',
  poet_slug: 'al-mutanabbi',
  poem_title: 'قصيدة',
  poem_snippet: 'شطر*شطر',
  poem_meter: 'الطويل',
  poem_meter_slug: 'altawil',
  poem_slug: 'poem-uuid',
  relevance: 0.9,
  total_count: 5,
};

const POETS_ROW = {
  poet_name: 'المتنبي',
  poet_era: 'عباسي',
  poet_era_slug: 'abbasid',
  poet_slug: 'al-mutanabbi',
  poet_bio: 'شاعر عباسي',
  relevance: 0.8,
  total_count: 3,
};

describe('searchPoems (mock)', () => {
  it('returns mapped rows when no filters are provided', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([POEMS_ROW]),
    } as unknown as DbClient;

    const result = await searchPoems(mockDb, 'قصيدة', 1, 'all', null, null, null, null);
    expect(result.totalCount).toBe(5);
    expect(result.rows[0]?.poetName).toBe('المتنبي');
    expect(result.rows[0]?.poemMeter).toBe('الطويل');
    expect(result.rows[0]?.poemMeterSlug).toBe('altawil');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('looks up filter IDs then searches', async () => {
    const lookupRows = [
      { kind: 'meter', id: 1 },
      { kind: 'era', id: 2 },
      { kind: 'theme', id: 3 },
      { kind: 'rhyme', id: 4 },
      { kind: 'unknown', id: 99 },
    ];
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce(lookupRows).mockResolvedValueOnce([POEMS_ROW]),
    } as unknown as DbClient;

    const result = await searchPoems(
      mockDb,
      'test',
      1,
      'all',
      ['الطويل'],
      ['abbasid'],
      ['فخر'],
      ['meem']
    );
    expect(result.totalCount).toBe(5);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('treats empty slug arrays as no-filter (early return, 1 execute call)', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([POEMS_ROW]),
    } as unknown as DbClient;

    await searchPoems(mockDb, 'test', 1, 'all', [], [], [], []);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('covers mLit-null branch (era filter only)', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ kind: 'era', id: 2 }])
        .mockResolvedValueOnce([POEMS_ROW]),
    } as unknown as DbClient;

    await searchPoems(mockDb, 'test', 1, 'all', null, ['abbasid'], null, null);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('covers eLit-null path (meter-only filter)', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ kind: 'meter', id: 1 }])
        .mockResolvedValueOnce([POEMS_ROW]),
    } as unknown as DbClient;

    const result = await searchPoems(mockDb, 'test', 1, 'all', ['الطويل'], null, null, null);
    expect(result.totalCount).toBe(5);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('returns empty result when raw is empty', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await searchPoems(mockDb, 'قصيدة', 1, 'all', null, null, null, null);
    expect(result).toEqual({ rows: [], totalCount: 0 });
  });

  it('throws when total_count is missing from row', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([{ ...POEMS_ROW, total_count: undefined }]),
    } as unknown as DbClient;

    await expect(searchPoems(mockDb, 'test', 1, 'all', null, null, null, null)).rejects.toThrow(
      'missing total_count'
    );
  });

  it('throws when total_count is not finite', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([{ ...POEMS_ROW, total_count: 'NaN' }]),
    } as unknown as DbClient;

    await expect(searchPoems(mockDb, 'test', 1, 'all', null, null, null, null)).rejects.toThrow(
      'not a finite number'
    );
  });
});

describe('searchPoets (mock)', () => {
  it('returns mapped rows when no era filter is provided', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([POETS_ROW]),
    } as unknown as DbClient;

    const result = await searchPoets(mockDb, 'شاعر', 1, 'all', null);
    expect(result.totalCount).toBe(3);
    expect(result.rows[0]?.poetName).toBe('المتنبي');
    expect(result.rows[0]?.poetBio).toBe('شاعر عباسي');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('looks up era IDs then searches', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([POETS_ROW]),
    } as unknown as DbClient;

    const result = await searchPoets(mockDb, 'test', 1, 'all', ['abbasid']);
    expect(result.totalCount).toBe(3);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('treats empty era slugs as no-filter (1 execute call)', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([POETS_ROW]),
    } as unknown as DbClient;

    await searchPoets(mockDb, 'test', 1, 'all', []);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('returns empty result when raw is empty', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await searchPoets(mockDb, 'شاعر', 1, 'all', null);
    expect(result).toEqual({ rows: [], totalCount: 0 });
  });

  it('throws when total_count is missing', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([{ ...POETS_ROW, total_count: null }]),
    } as unknown as DbClient;

    await expect(searchPoets(mockDb, 'test', 1, 'all', null)).rejects.toThrow(
      'missing total_count'
    );
  });

  it('throws when total_count is not finite', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([{ ...POETS_ROW, total_count: 'bad' }]),
    } as unknown as DbClient;

    await expect(searchPoets(mockDb, 'test', 1, 'all', null)).rejects.toThrow(
      'not a finite number'
    );
  });
});

const FILTER_POEMS_ROW = {
  poet_name: 'شاعر',
  poet_era: 'عباسي',
  poet_era_slug: 'abbasid',
  poet_slug: 'poet-slug',
  poem_title: 'قصيدة',
  poem_snippet: 'شطر',
  poem_meter: 'الطويل',
  poem_meter_slug: 'altawil',
  poem_slug: 'poem-uuid',
  relevance: 0,
};

const FILTER_POETS_ROW = {
  poet_name: 'شاعر',
  poet_era: 'عباسي',
  poet_era_slug: 'abbasid',
  poet_slug: 'poet-slug',
  poet_bio: 'بيو',
  relevance: 0,
};

describe('listPoemsByFilters (mock)', () => {
  it('returns rows and count when no filters applied', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POEMS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    } as unknown as DbClient;

    const result = await listPoemsByFilters(mockDb, 1, null, null, null, null);
    expect(result.totalCount).toBe(1);
    expect(result.rows[0]?.poetName).toBe('شاعر');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
    expect(result.rows[0]?.poemMeterSlug).toBe('altawil');
  });

  it('covers intArrayParam branches: null, [], and [id]', async () => {
    const lookupRows = [{ kind: 'meter', id: 1 }];
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce(lookupRows)
        .mockResolvedValueOnce([FILTER_POEMS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    } as unknown as DbClient;

    const result = await listPoemsByFilters(mockDb, 1, ['الطويل'], ['abbasid'], ['فخر'], ['meem']);
    expect(result.totalCount).toBe(1);
  });

  it('throws when count row has no total', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([FILTER_POEMS_ROW]).mockResolvedValueOnce([]),
    } as unknown as DbClient;

    await expect(listPoemsByFilters(mockDb, 1, null, null, null, null)).rejects.toThrow(
      'SQL row missing total'
    );
  });

  it('throws when total is not finite', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POEMS_ROW])
        .mockResolvedValueOnce([{ total: 'NaN' }]),
    } as unknown as DbClient;

    await expect(listPoemsByFilters(mockDb, 1, null, null, null, null)).rejects.toThrow(
      'total is not finite'
    );
  });
});

describe('listPoetsByFilters (mock)', () => {
  it('returns rows and count with no era filter', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    } as unknown as DbClient;

    const result = await listPoetsByFilters(mockDb, 1, null);
    expect(result.totalCount).toBe(1);
    expect(result.rows[0]?.poetName).toBe('شاعر');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('looks up era IDs when era slugs are provided', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    } as unknown as DbClient;

    const result = await listPoetsByFilters(mockDb, 1, ['abbasid']);
    expect(result.totalCount).toBe(1);
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it('treats empty era slugs as no-filter', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    } as unknown as DbClient;

    await listPoetsByFilters(mockDb, 1, []);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('throws when count row has no total', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([FILTER_POETS_ROW]).mockResolvedValueOnce(null),
    } as unknown as DbClient;

    await expect(listPoetsByFilters(mockDb, 1, null)).rejects.toThrow('SQL row missing total');
  });
});
