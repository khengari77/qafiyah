/**
 * Integration tests for filter-only search against the local Postgres dump.
 * Skipped unless TEST_DATABASE_URL is provided (e.g. `bun run db:up` then export).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asEraSlug, asMeterSlug } from './brand';
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
// Naïve ILIKE baseline tests — no FTS stored-proc references (Task 1.3)
// ---------------------------------------------------------------------------

// Captures all SQL strings emitted by execute calls, returning them joined.
// The mock alternates: odd calls get rowsData, even calls get countData.
function captureDb(rowsData: readonly unknown[], countData: readonly unknown[] = [{ total: 1 }]) {
  const captured: string[] = [];
  let callIndex = 0;
  const execute = vi.fn((q: unknown) => {
    captured.push(JSON.stringify(q));
    const result = callIndex % 2 === 0 ? rowsData : countData;
    callIndex++;
    return Promise.resolve(result as never);
  });
  return {
    db: castPartialAsDbClient({ execute }) as unknown as DbClient,
    sql: () => captured.join(' '),
  };
}

describe('naïve search baseline (no FTS)', () => {
  const poemRow = {
    poet_name: 'p',
    poet_era: 'e',
    poet_era_slug: 'abbasid',
    poet_slug: 'ps',
    poem_title: 't',
    poem_snippet: 's',
    poem_meter: 'm',
    poem_meter_slug: 'ms',
    poem_slug: '00000000-0000-0000-0000-000000000000',
    relevance: 0,
  };

  it('searchPoems maps rows and emits no FTS references', async () => {
    const { db, sql } = captureDb([{ ...poemRow }]);
    const result = await searchPoems({
      db,
      query: 'حب',
      page: 1,
      matchType: 'all',
      filters: { meterSlugs: null, eraSlugs: null, themeSlugs: null, rhymeSlugs: null },
    });
    expect(result.isOk()).toBe(true);
    const sqlText = sql();
    expect(sqlText).not.toContain('search_poems');
    expect(sqlText).not.toContain('search_vector');
  });

  it('searchPoems correctly maps row fields', async () => {
    const { db } = captureDb([{ ...poemRow }]);
    const result = await searchPoems({
      db,
      query: 'حب',
      page: 1,
      matchType: 'all',
      filters: { meterSlugs: null, eraSlugs: null, themeSlugs: null, rhymeSlugs: null },
    });
    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.totalCount).toBe(1);
    expect(page.rows[0]?.poetName).toBe('p');
    expect(page.rows[0]?.poemSlug).toBe('00000000-0000-0000-0000-000000000000');
    expect(page.rows[0]?.poetEraSlug).toBe('abbasid');
  });

  it('searchPoets maps rows and emits no FTS references', async () => {
    const poetRow = {
      poet_name: 'p',
      poet_era: 'e',
      poet_era_slug: 'abbasid',
      poet_slug: 'ps',
      poet_bio: 'b',
      relevance: 0,
    };
    const { db, sql } = captureDb([{ ...poetRow }]);
    const result = await searchPoets({
      db,
      query: 'المتنبي',
      page: 1,
      matchType: 'all',
      eraSlugs: null,
    });
    expect(result.isOk()).toBe(true);
    const sqlText = sql();
    expect(sqlText).not.toContain('search_poets');
    expect(sqlText).not.toContain('search_vector');
  });

  it('searchPoets correctly maps row fields', async () => {
    const poetRow = {
      poet_name: 'المتنبي',
      poet_era: 'عباسي',
      poet_era_slug: 'abbasid',
      poet_slug: 'al-mutanabbi',
      poet_bio: 'شاعر',
      relevance: 0,
    };
    const { db } = captureDb([{ ...poetRow }]);
    const result = await searchPoets({
      db,
      query: 'المتنبي',
      page: 1,
      matchType: 'all',
      eraSlugs: null,
    });
    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.totalCount).toBe(1);
    expect(page.rows[0]?.poetName).toBe('المتنبي');
    expect(page.rows[0]?.poetBio).toBe('شاعر');
    expect(page.rows[0]?.poetEraSlug).toBe('abbasid');
  });
});

// ---------------------------------------------------------------------------
// Mock-based unit tests (no real DB required)
// ---------------------------------------------------------------------------

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
    if (error.kind === 'missing_total') {
      expect(error.source).toBe('browsePoemsByFilters');
    }
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
