/**
 * Integration tests for filter-only search against the local Postgres dump.
 * Skipped unless TEST_DATABASE_URL is provided (e.g. `bun run db:setup` then export).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asEraSlug, asMeterSlug, asRhymeSlug, asThemeSlug } from './brand';
import { createDb, type DbClient } from './client';
import {
  browsePoemsByFilters,
  browsePoetsByFilters,
  searchPoems,
  searchPoets,
} from './search.queries';
import { castPartialAsDbClient } from './test-utils';

const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? '';
const UUID_REGEX = /^[0-9a-f-]{36}$/;
const skip = TEST_DATABASE_URL === '';
const describeIfDb = skip ? describe.skip : describe;

const EMPTY_FILTERS = {
  meterSlugs: null,
  eraSlugs: null,
  themeSlugs: null,
  rhymeSlugs: null,
} as const;

describeIfDb('filter-only search queries (integration)', () => {
  let db: DbClient;

  beforeAll(() => {
    db = createDb(TEST_DATABASE_URL)._unsafeUnwrap();
  });

  afterAll(async () => {
    // postgres-js holds open sockets; let GC clear them after this run.
  });

  it('browsePoemsByFilters: by era slug returns rows + non-zero total', async () => {
    const result = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('abbasid')] },
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(5);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poetEraSlug).toBe('abbasid');
      expect(row.poemTitle).toBeTypeOf('string');
      expect(row.poemSlug).toMatch(UUID_REGEX);
      expect(row.poemMeterSlug).toBeTypeOf('string');
    }
  });

  it('browsePoemsByFilters: numeric ID-string is also accepted as a slug', async () => {
    const bySlug = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('abbasid')] },
      })
    )._unsafeUnwrap();
    const byId = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('2')] },
      })
    )._unsafeUnwrap();
    expect(byId.totalCount).toBe(bySlug.totalCount);
  });

  it('browsePoemsByFilters: combining filters narrows results', async () => {
    const eraOnly = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('abbasid')] },
      })
    )._unsafeUnwrap();
    const eraAndMeter = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: {
          ...EMPTY_FILTERS,
          meterSlugs: [asMeterSlug('alkamil')],
          eraSlugs: [asEraSlug('abbasid')],
        },
      })
    )._unsafeUnwrap();
    expect(eraAndMeter.totalCount).toBeLessThanOrEqual(eraOnly.totalCount);
  });

  it('browsePoemsByFilters: unknown filter yields zero results', async () => {
    const result = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('__nonexistent__')] },
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('browsePoetsByFilters: by era slug returns rows', async () => {
    const result = (
      await browsePoetsByFilters({
        db,
        page: 1,
        eraSlugs: [asEraSlug('abbasid')],
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(10);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poetEraSlug).toBe('abbasid');
      expect(row.poetSlug).toBeTypeOf('string');
    }
  });

  it('browsePoetsByFilters: no filter returns all poets', async () => {
    const all = (await browsePoetsByFilters({ db, page: 1, eraSlugs: null }))._unsafeUnwrap();
    const filtered = (
      await browsePoetsByFilters({
        db,
        page: 1,
        eraSlugs: [asEraSlug('abbasid')],
      })
    )._unsafeUnwrap();
    expect(all.totalCount).toBeGreaterThanOrEqual(filtered.totalCount);
  });

  it('browsePoemsByFilters: pagination', async () => {
    const page1 = (
      await browsePoemsByFilters({
        db,
        page: 1,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('abbasid')] },
      })
    )._unsafeUnwrap();
    const page2 = (
      await browsePoemsByFilters({
        db,
        page: 2,
        filters: { ...EMPTY_FILTERS, eraSlugs: [asEraSlug('abbasid')] },
      })
    )._unsafeUnwrap();
    if (page1.totalCount > 5) {
      expect(page2.rows.length).toBeGreaterThan(0);
      const page1Slugs = new Set(page1.rows.map((row) => row.poemSlug));
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
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([POEMS_ROW]),
    });

    const result = (
      await searchPoems({
        db: mockDb,
        query: 'قصيدة',
        page: 1,
        matchType: 'all',
        filters: EMPTY_FILTERS,
      })
    )._unsafeUnwrap();
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
    ];
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce(lookupRows).mockResolvedValueOnce([POEMS_ROW]),
    });

    const result = (
      await searchPoems({
        db: mockDb,
        query: 'test',
        page: 1,
        matchType: 'all',
        filters: {
          meterSlugs: [asMeterSlug('الطويل')],
          eraSlugs: [asEraSlug('abbasid')],
          themeSlugs: [asThemeSlug('فخر')],
          rhymeSlugs: [asRhymeSlug('meem')],
        },
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(5);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('treats empty slug arrays as no-filter (early return, 1 execute call)', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([POEMS_ROW]),
    });

    await searchPoems({
      db: mockDb,
      query: 'test',
      page: 1,
      matchType: 'all',
      filters: { meterSlugs: [], eraSlugs: [], themeSlugs: [], rhymeSlugs: [] },
    });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('returns empty result when raw is empty', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = (
      await searchPoems({
        db: mockDb,
        query: 'قصيدة',
        page: 1,
        matchType: 'all',
        filters: EMPTY_FILTERS,
      })
    )._unsafeUnwrap();
    expect(result).toEqual({ rows: [], totalCount: 0 });
  });

  it('returns missing_total when total_count is missing from row', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...POEMS_ROW, total_count: undefined }]),
    });

    const result = await searchPoems({
      db: mockDb,
      query: 'test',
      page: 1,
      matchType: 'all',
      filters: EMPTY_FILTERS,
    });
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('missing_total');
    expect(error.source).toBe('searchPoems');
    expect(error.inputs).toMatchObject({ query: 'test', page: 1, matchType: 'all' });
  });

  it('returns non_finite_total when total_count is not finite', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...POEMS_ROW, total_count: 'NaN' }]),
    });

    const result = await searchPoems({
      db: mockDb,
      query: 'test',
      page: 1,
      matchType: 'all',
      filters: EMPTY_FILTERS,
    });
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('non_finite_total');
    if (error.kind === 'non_finite_total') expect(error.raw).toBe('NaN');
  });
});

describe('searchPoets (mock)', () => {
  it('returns mapped rows when no era filter is provided', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([POETS_ROW]),
    });

    const result = (
      await searchPoets({
        db: mockDb,
        query: 'شاعر',
        page: 1,
        matchType: 'all',
        eraSlugs: null,
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(3);
    expect(result.rows[0]?.poetName).toBe('المتنبي');
    expect(result.rows[0]?.poetBio).toBe('شاعر عباسي');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('looks up era IDs then searches', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([POETS_ROW]),
    });

    const result = (
      await searchPoets({
        db: mockDb,
        query: 'test',
        page: 1,
        matchType: 'all',
        eraSlugs: [asEraSlug('abbasid')],
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(3);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('treats empty era slugs as no-filter (1 execute call)', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([POETS_ROW]),
    });

    await searchPoets({ db: mockDb, query: 'test', page: 1, matchType: 'all', eraSlugs: [] });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('returns empty result when raw is empty', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = (
      await searchPoets({
        db: mockDb,
        query: 'شاعر',
        page: 1,
        matchType: 'all',
        eraSlugs: null,
      })
    )._unsafeUnwrap();
    expect(result).toEqual({ rows: [], totalCount: 0 });
  });

  it('returns missing_total when total_count is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...POETS_ROW, total_count: undefined }]),
    });

    const result = await searchPoets({
      db: mockDb,
      query: 'test',
      page: 1,
      matchType: 'all',
      eraSlugs: null,
    });
    expect(result._unsafeUnwrapErr().kind).toBe('missing_total');
  });

  it('returns non_finite_total when total_count is not finite', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...POETS_ROW, total_count: 'bad' }]),
    });

    const result = await searchPoets({
      db: mockDb,
      query: 'test',
      page: 1,
      matchType: 'all',
      eraSlugs: null,
    });
    expect(result._unsafeUnwrapErr().kind).toBe('non_finite_total');
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

describe('browsePoemsByFilters (mock)', () => {
  it('returns rows and count when no filters applied', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POEMS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    });

    const result = (
      await browsePoemsByFilters({ db: mockDb, page: 1, filters: EMPTY_FILTERS })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(1);
    expect(result.rows[0]?.poetName).toBe('شاعر');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
    expect(result.rows[0]?.poemMeterSlug).toBe('altawil');
  });

  it('returns missing_total when count row has no total', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([FILTER_POEMS_ROW]).mockResolvedValueOnce([]),
    });

    const result = await browsePoemsByFilters({
      db: mockDb,
      page: 1,
      filters: EMPTY_FILTERS,
    });
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('missing_total');
    expect(error.source).toBe('browsePoemsByFilters');
  });

  it('returns non_finite_total when total is not finite', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POEMS_ROW])
        .mockResolvedValueOnce([{ total: 'NaN' }]),
    });

    const result = await browsePoemsByFilters({
      db: mockDb,
      page: 1,
      filters: EMPTY_FILTERS,
    });
    expect(result._unsafeUnwrapErr().kind).toBe('non_finite_total');
  });
});

describe('browsePoetsByFilters (mock)', () => {
  it('returns rows and count with no era filter', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    });

    const result = (
      await browsePoetsByFilters({ db: mockDb, page: 1, eraSlugs: null })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(1);
    expect(result.rows[0]?.poetName).toBe('شاعر');
    expect(result.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('looks up era IDs when era slugs are provided', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    });

    const result = (
      await browsePoetsByFilters({
        db: mockDb,
        page: 1,
        eraSlugs: [asEraSlug('abbasid')],
      })
    )._unsafeUnwrap();
    expect(result.totalCount).toBe(1);
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it('treats empty era slugs as no-filter', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([FILTER_POETS_ROW])
        .mockResolvedValueOnce([{ total: 1 }]),
    });

    await browsePoetsByFilters({ db: mockDb, page: 1, eraSlugs: [] });
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('returns missing_total when count row is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([FILTER_POETS_ROW]).mockResolvedValueOnce([]),
    });

    const result = await browsePoetsByFilters({ db: mockDb, page: 1, eraSlugs: null });
    expect(result._unsafeUnwrapErr().kind).toBe('missing_total');
  });
});
