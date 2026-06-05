import { describe, expect, it, vi } from 'vitest';
import {
  asCollectionSlug,
  asEraSlug,
  asMeterSlug,
  asPoemSlug,
  asPoetSlug,
  asRhymeSlug,
  asThemeSlug,
} from './brand';
import {
  countPoems,
  getPoemBySlug,
  getRandomPoem,
  listPoemSlugs,
  listPoems,
  parsePoemContent,
} from './poems.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('parsePoemContent', () => {
  it('splits an even number of lines into verse pairs', () => {
    const { verses } = parsePoemContent('أ*ب*ج*د');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', 'د'],
    ]);
  });

  it('handles an odd number of lines (last verse gets empty second half)', () => {
    const { verses } = parsePoemContent('أ*ب*ج');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', ''],
    ]);
  });

  it('builds sample from first three lines joined with " * "', () => {
    const { sample } = parsePoemContent('أول*ثاني*ثالث*رابع');
    expect(sample).toBe('أول * ثاني * ثالث');
  });

  it('builds keywords as comma-separated words across all lines', () => {
    const { keywords } = parsePoemContent('شطر أول*شطر ثاني');
    expect(keywords).toBe('شطر,أول,شطر,ثاني');
  });

  it('uses empty string fallback when first half of a pair is empty', () => {
    // Content starting with '*' → lines[0] = '' (falsy) → '' fallback used for first half
    const { verses } = parsePoemContent('*ب');
    expect(verses).toEqual([['', 'ب']]);
  });

  it('handles a single line (one verse with empty second half)', () => {
    const { verses } = parsePoemContent('بيت');
    expect(verses).toEqual([['بيت', '']]);
  });
});

const POEM_CONTENT = 'شطر أول*شطر ثانٍ';

describe('listPoemSlugs', () => {
  it('returns the requested page of slugs', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([{ slug: 'abcd' }, { slug: 'efgh' }])),
      }),
    });

    const value = (await listPoemSlugs(mockDb, 1, 45_000))._unsafeUnwrap();
    expect(value).toEqual(['abcd', 'efgh']);
  });

  it('returns empty slugs when the page is beyond the last poem', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listPoemSlugs(mockDb, 99, 45_000))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('countPoems', () => {
  it('returns the total poem count', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([{ total: 2 }])) }),
    });

    expect((await countPoems(mockDb))._unsafeUnwrap()).toBe(2);
  });

  it('returns 0 when the count query yields no row', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    expect((await countPoems(mockDb))._unsafeUnwrap()).toBe(0);
  });
});

const RANDOM_POEM_DATA = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT, slug: 'abcd' };

describe('getRandomPoem', () => {
  it('returns RandomPoemLines including slug for a JSON object result', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ random_poem_json: RANDOM_POEM_DATA }]),
    });

    const poem = (await getRandomPoem(mockDb))._unsafeUnwrap();
    expect(poem.poetName).toBe('شاعر');
    expect(poem.content).toBe(POEM_CONTENT);
    expect(poem.slug).toBe('abcd');
  });

  it('parses a JSON string result', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ random_poem_json: JSON.stringify(RANDOM_POEM_DATA) }]),
    });

    const poem = (await getRandomPoem(mockDb))._unsafeUnwrap();
    expect(poem.slug).toBe('abcd');
  });

  it('returns no_eligible_poem when execute returns empty array', async () => {
    const mockDb = castPartialAsDbClient({ execute: vi.fn().mockResolvedValue([]) });
    expect((await getRandomPoem(mockDb))._unsafeUnwrapErr().kind).toBe('no_eligible_poem');
  });

  it('returns no_eligible_poem when random_poem_json is falsy', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ random_poem_json: null }]),
    });
    expect((await getRandomPoem(mockDb))._unsafeUnwrapErr().kind).toBe('no_eligible_poem');
  });

  it('returns invalid_payload_shape when slug field is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValue([
          { random_poem_json: { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT } },
        ]),
    });
    expect((await getRandomPoem(mockDb))._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });

  it('returns invalid_json when string payload is malformed', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ random_poem_json: '{not-json' }]),
    });
    expect((await getRandomPoem(mockDb))._unsafeUnwrapErr().kind).toBe('invalid_json');
  });

  it('returns query_failed when db.execute rejects', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockRejectedValue(new Error('connection lost')),
    });
    const error = (await getRandomPoem(mockDb))._unsafeUnwrapErr();
    expect(error.kind).toBe('query_failed');
    if (error.kind === 'query_failed') expect(error.message).toBe('connection lost');
  });
});

const fullPoemRow = {
  slug: 'abcd',
  title: 'قصيدة المتنبي',
  content: POEM_CONTENT,
  verse_count: 1,
  poet_name: 'المتنبي',
  poet_slug: 'almutanabbi',
  meter_name: 'الطويل',
  meter_slug: 'altawil',
  theme_name: 'فخر',
  theme_slug: 'fakhr',
  era_name: 'عباسي',
  era_slug: 'abbasid',
  related_poems: [
    {
      title: 'قصيدة أخرى',
      slug: 'efgh',
      poet_name: 'شاعر آخر',
      poet_slug: 'other-poet',
      meter_name: 'البسيط',
      meter_slug: 'albasit',
    },
  ],
};

describe('getPoemBySlug', () => {
  it('returns ok with poem detail and related poems', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([fullPoemRow]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    const data = result._unsafeUnwrap();
    expect(data.displayTitle).toBe('قصيدة المتنبي');
    expect(data.metadata.poetName).toBe('المتنبي');
    expect(data.metadata.poetSlug).toBe('almutanabbi');
    expect(data.metadata.meterSlug).toBe('altawil');
    expect(data.metadata.themeSlug).toBe('fakhr');
    expect(data.metadata.eraSlug).toBe('abbasid');
    expect(data.relatedPoems).toHaveLength(1);
    expect(data.relatedPoems[0]?.poetSlug).toBe('other-poet');
    expect(data.relatedPoems[0]?.meterSlug).toBe('albasit');
  });

  it('returns empty relatedPoems when related_poems is empty', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...fullPoemRow, related_poems: [] }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    expect(result._unsafeUnwrap().relatedPoems).toHaveLength(0);
  });

  it('returns not_found when query returns empty array', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('missing'));
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns sql_error when db.execute rejects', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockRejectedValueOnce(new Error('connection lost')),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('sql_error');
    if (error.kind === 'sql_error') {
      expect(error.message).toBe('connection lost');
    }
  });

  it('returns incomplete_poem_data when theme_name is null', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ ...fullPoemRow, theme_name: null, theme_slug: null }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    expect(result._unsafeUnwrapErr().kind).toBe('incomplete_poem_data');
  });

  it('returns incomplete_poem_data when title is null', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ ...fullPoemRow, title: null }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    expect(result._unsafeUnwrapErr().kind).toBe('incomplete_poem_data');
  });

  it('returns invalid_payload_shape when row shape is wrong', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([{ not_a_poem: true }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('abcd'));
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });
});

describe('listPoems (integration)', () => {
  it('returns paginated poems with stable id order when no filters are provided', async () => {
    await withTestDb(async (db) => {
      const result = await listPoems(db, {}, 1);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      const { poems, total, totalPages } = result.value;
      expect(poems.length).toBe(30);
      expect(total).toBeGreaterThan(30);
      expect(totalPages).toBeGreaterThan(1);
      expect(poems[0]).toMatchObject({
        title: expect.any(String),
        slug: expect.any(String),
        poetName: expect.any(String),
        meterName: expect.any(String),
      });
    });
  });

  it('filters by a single poet slug', async () => {
    await withTestDb(async (db) => {
      const result = await listPoems(db, { poetSlugs: [asPoetSlug('alasha')] }, 1);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      for (const p of result.value.poems) {
        expect(p.poetSlug).toBe('alasha');
      }
      expect(result.value.total).toBeGreaterThan(0);
    });
  });

  it('filters by era transitively through poets', async () => {
    await withTestDb(async (db) => {
      const result = await listPoems(db, { eraSlugs: [asEraSlug('islami')] }, 1);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.total).toBeGreaterThan(0);
    });
  });

  it('ORs within a single repeated filter (poetSlugs: [a, b])', async () => {
    await withTestDb(async (db) => {
      const single = await listPoems(db, { poetSlugs: [asPoetSlug('abn-rumi')] }, 1);
      const other = await listPoems(db, { poetSlugs: [asPoetSlug('abn-nbath')] }, 1);
      const both = await listPoems(
        db,
        { poetSlugs: [asPoetSlug('abn-rumi'), asPoetSlug('abn-nbath')] },
        1
      );
      expect(single.isOk() && other.isOk() && both.isOk()).toBe(true);
      if (single.isErr() || other.isErr() || both.isErr()) return;
      expect(both.value.total).toBe(single.value.total + other.value.total);
    });
  });

  it('ANDs across distinct filters (poet AND meter narrows the result)', async () => {
    await withTestDb(async (db) => {
      const poetOnly = await listPoems(db, { poetSlugs: [asPoetSlug('alasha')] }, 1);
      const intersection = await listPoems(
        db,
        {
          poetSlugs: [asPoetSlug('alasha')],
          meterSlugs: [asMeterSlug('albasit')],
        },
        1
      );
      expect(poetOnly.isOk() && intersection.isOk()).toBe(true);
      if (poetOnly.isErr() || intersection.isErr()) return;
      expect(intersection.value.total).toBeLessThanOrEqual(poetOnly.value.total);
    });
  });

  it('returns an empty page (total 0) for an unknown slug — NOT a not_found error', async () => {
    await withTestDb(async (db) => {
      const result = await listPoems(
        db,
        { poetSlugs: [asPoetSlug('not-a-real-poet-slug-zzz')] },
        1
      );
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.poems).toEqual([]);
      expect(result.value.total).toBe(0);
      expect(result.value.totalPages).toBe(1);
    });
  });

  it('honors page parameter (page 2 differs from page 1)', async () => {
    await withTestDb(async (db) => {
      const p1 = await listPoems(db, {}, 1);
      const p2 = await listPoems(db, {}, 2);
      expect(p1.isOk() && p2.isOk()).toBe(true);
      if (p1.isErr() || p2.isErr()) return;
      const firstSlugP1 = p1.value.poems[0]?.slug;
      const firstSlugP2 = p2.value.poems[0]?.slug;
      expect(firstSlugP1).not.toBe(firstSlugP2);
    });
  });

  it('combines theme + rhyme + collection filters honestly', async () => {
    await withTestDb(async (db) => {
      const result = await listPoems(
        db,
        {
          themeSlugs: [asThemeSlug('almadih')],
          rhymeSlugs: [asRhymeSlug('lam')],
          collectionSlugs: [asCollectionSlug('almuallaqat')],
        },
        1
      );
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.totalPages).toBeGreaterThanOrEqual(1);
    });
  });
});
