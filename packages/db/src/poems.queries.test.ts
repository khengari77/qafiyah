import { afterEach, describe, expect, it, vi } from 'vitest';
import { asPoemSlug } from './brand';
import {
  extractPoemExcerpt,
  getPoemBySlug,
  getRandomPoemExcerpt,
  getRandomPoemSlug,
  listAllPoemSlugs,
  type PoemId,
  parsePoemContent,
  type RandomPoemLines,
} from './poems.queries';
import { castPartialAsDbClient, makeChain } from './test-utils';

// test-only: brand a literal number as a PoemId for fixture construction.
const asPoemId = (n: number): PoemId => n as PoemId;
const makeRandomPoem = (content: string): RandomPoemLines => ({
  poemId: asPoemId(1),
  poetName: 'شاعر',
  content,
});

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

  it('reports correct verseCount', () => {
    const { verseCount } = parsePoemContent('أ*ب*ج*د');
    expect(verseCount).toBe(2);
  });

  it('strips double quotes from content', () => {
    const { verses } = parsePoemContent('"أ"*"ب"');
    expect(verses).toEqual([['أ', 'ب']]);
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
    const { verses, verseCount } = parsePoemContent('بيت');
    expect(verses).toEqual([['بيت', '']]);
    expect(verseCount).toBe(1);
  });
});

describe('extractPoemExcerpt', () => {
  it('returns the two lines at startIndex plus the poet name', () => {
    const result = extractPoemExcerpt(makeRandomPoem('شطر أول*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('returns insufficient_content error when poem has fewer than two lines', () => {
    const result = extractPoemExcerpt(makeRandomPoem('شطر واحد'), 0);
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('insufficient_content');
    expect(error.lineCount).toBe(1);
    expect(error.poemId).toBe(1);
  });

  it('strips double quotes from output', () => {
    const result = extractPoemExcerpt(makeRandomPoem('"شطر أول"*"شطر ثانٍ"'), 0);
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('includes the poet name in the output', () => {
    const p: RandomPoemLines = { poemId: asPoemId(2), poetName: 'المتنبي', content: 'أ*ب' };
    expect(extractPoemExcerpt(p, 0)._unsafeUnwrap()).toContain('المتنبي');
  });

  it('uses empty string fallback when lines[startIndex] is empty', () => {
    const result = extractPoemExcerpt(makeRandomPoem('*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result._unsafeUnwrap()).toContain('شاعر');
  });

  it('uses empty string fallback when lines[startIndex + 1] is empty', () => {
    const result = extractPoemExcerpt(makeRandomPoem('شطر أول**شطر ثالث*شطر رابع'), 0);
    expect(result._unsafeUnwrap()).toContain('شاعر');
  });

  it('returns a valid pair for any even startIndex in range', () => {
    const lines = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const content = lines.join('*');
    for (let startIndex = 0; startIndex < lines.length - 1; startIndex += 2) {
      const result = extractPoemExcerpt(makeRandomPoem(content), startIndex);
      const unwrapped = result._unsafeUnwrap();
      expect(unwrapped).toBeTruthy();
      expect(unwrapped.split('\n').length).toBeGreaterThanOrEqual(2);
    }
  });
});

const POEM_CONTENT = 'شطر أول*شطر ثانٍ';

describe('listAllPoemSlugs', () => {
  it('returns all slugs and total count', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([{ slug: 'slug-1' }, { slug: 'slug-2' }])),
      }),
    });

    const value = (await listAllPoemSlugs(mockDb))._unsafeUnwrap();
    expect(value).toEqual(['slug-1', 'slug-2']);
  });

  it('returns empty slugs when no poems exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listAllPoemSlugs(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('getRandomPoemExcerpt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns structured excerpt for a JSON object result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    const excerpt = result._unsafeUnwrap();
    expect(excerpt.lines[0]).toBe('شطر أول');
    expect(excerpt.lines[1]).toBe('شطر ثانٍ');
    expect(excerpt.poetName).toBe('شاعر');
    expect(excerpt.excerpt).toContain('شطر أول');
    expect(excerpt.excerpt).toContain('شاعر');
  });

  it('parses a JSON string result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: JSON.stringify(poemData) }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    expect(result._unsafeUnwrap().excerpt).toContain('شطر أول');
  });

  it('returns no_eligible_poem when execute returns empty array', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('no_eligible_poem');
  });

  it('returns no_eligible_poem when get_random_eligible_poem is falsy', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: null }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('no_eligible_poem');
  });

  it('returns invalid_payload_shape when poem content field is missing from payload', async () => {
    const poemData = { poem_id: 1, poet_name: 'شاعر' };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });

  it('returns invalid_json when string payload is malformed', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: '{not-json' }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_json');
  });

  it('returns excerpt_too_long when excerpt exceeds MAX_TWEET_LENGTH', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const longLine = 'أ'.repeat(141);
    const poemData = {
      poem_id: 1,
      poet_name: 'شاعر',
      content: `${longLine}*${longLine}`,
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    const result = await getRandomPoemExcerpt(mockDb);
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('excerpt_too_long');
    if (error.kind === 'excerpt_too_long') {
      expect(error.length).toBeGreaterThan(error.max);
      expect(error.poemId).toBe(1);
    }
  });
});

describe('getRandomPoemSlug', () => {
  it('returns slug from a valid response', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 'test-slug-uuid' } }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result._unsafeUnwrap()).toBe('test-slug-uuid');
  });

  it('returns no_eligible_poem_slug when execute returns empty array', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('no_eligible_poem_slug');
  });

  it('returns no_eligible_poem_slug when get_random_eligible_poem_slug is null', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: null }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('no_eligible_poem_slug');
  });

  it('returns invalid_payload_shape when value is not an object', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: 'just-a-string' }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });

  it('returns invalid_payload_shape when slug property is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { other: 'field' } }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('invalid_payload_shape');
    if (error.kind === 'invalid_payload_shape') {
      expect(error.raw).toEqual({ other: 'field' });
    }
  });

  it('returns invalid_payload_shape when slug is not a string', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 42 } }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });
});

const fullPoemData = {
  poem: {
    slug: 'poem-slug',
    title: '"قصيدة المتنبي"',
    content: POEM_CONTENT,
    poet_name: 'المتنبي',
    poet_slug: 'al-mutanabbi',
    meter_name: 'الطويل',
    theme_name: 'فخر',
    era_name: 'عباسي',
    era_slug: 'abbasid',
  },
  related_poems: [
    {
      poem_slug: 'related-slug',
      poet_name: 'شاعر آخر',
      meter_name: 'البسيط',
      poem_title: 'قصيدة أخرى',
    },
  ],
};

describe('getPoemBySlug', () => {
  it('returns ok result with enriched slugs for poem and related', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ get_poem_with_related: fullPoemData }])
        .mockResolvedValueOnce([{ slug: 'altawil' }]) // meter
        .mockResolvedValueOnce([{ slug: 'fakhr' }]) // theme
        .mockResolvedValueOnce([
          { poem_slug: 'related-slug', poet_slug: 'other-poet', meter_slug: 'albasit' },
        ]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('poem-slug'));
    const data = result._unsafeUnwrap();
    expect(data.displayTitle).toBe('قصيدة المتنبي');
    expect(data.metadata.poetName).toBe('المتنبي');
    expect(data.metadata.meterSlug).toBe('altawil');
    expect(data.metadata.themeSlug).toBe('fakhr');
    expect(data.relatedPoems[0]?.poetSlug).toBe('other-poet');
    expect(data.relatedPoems[0]?.meterSlug).toBe('albasit');
  });

  it('strips double quotes from title', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ get_poem_with_related: fullPoemData }])
        .mockResolvedValueOnce([{ slug: 'altawil' }])
        .mockResolvedValueOnce([{ slug: 'fakhr' }])
        .mockResolvedValueOnce([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('poem-slug'));
    expect(result._unsafeUnwrap().displayTitle).not.toContain('"');
  });

  it('returns not_found when execute returns empty array', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('missing-slug'));
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns not_found when get_poem_with_related is falsy', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: null }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('missing-slug'));
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns sql_error when data has error field with message', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValue([
          { get_poem_with_related: { error: 'not_found', message: 'Poem not found' } },
        ]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('sql_error');
    if (error.kind === 'sql_error') {
      expect(error.message).toBe('Poem not found');
    }
  });

  it('falls back to error field when message is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: { error: 'not_found' } }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('sql_error');
    if (error.kind === 'sql_error') {
      expect(error.message).toBe('not_found');
    }
  });

  it('returns not_found when the function reports "Not Found" (missing poem)', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([
        {
          get_poem_with_related: {
            error: 'Not Found',
            message: 'No poem found with slug: 00000000-0000-0000-0000-000000000000',
          },
        },
      ]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('00000000-0000-0000-0000-000000000000'));
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns not_found when the function reports "Invalid UUID format"', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([
        {
          get_poem_with_related: {
            error: 'Invalid UUID format',
            message: 'The provided slug is not a valid UUID: nope',
          },
        },
      ]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('nope'));
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns incomplete_poem_data when poem is missing required fields', async () => {
    const incompleteData = {
      poem: {
        slug: 'slug',
        title: '',
        content: 'a*b',
        poet_name: 'شاعر',
        poet_slug: 'poet',
        meter_name: '',
        theme_name: '',
        era_name: '',
        era_slug: '',
      },
      related_poems: [],
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: incompleteData }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result._unsafeUnwrapErr().kind).toBe('incomplete_poem_data');
  });

  it('returns incomplete_enrichment when meter slug enrichment is missing', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ get_poem_with_related: fullPoemData }])
        .mockResolvedValueOnce([]) // meter lookup empty
        .mockResolvedValueOnce([{ slug: 'fakhr' }])
        .mockResolvedValueOnce([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result._unsafeUnwrapErr().kind).toBe('incomplete_enrichment');
  });
});
