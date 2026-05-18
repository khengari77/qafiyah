import { afterEach, describe, expect, it, vi } from 'vitest';
import { asPoemSlug } from './brand';
import {
  extractPoemExcerpt,
  getPoemBySlug,
  getRandomPoemLines,
  getRandomPoemSlug,
  listAllPoemSlugs,
  type PoemId,
  processPoemContent,
  type RandomPoemLines,
  removeTashkeel,
} from './poems.queries';
import { fakeDb, makeChain } from './test-utils';

// test-only: brand a literal number as a PoemId for fixture construction.
const asPoemId = (n: number): PoemId => n as PoemId;
const makeRandomPoem = (content: string): RandomPoemLines => ({
  poem_id: asPoemId(1),
  poet_name: 'شاعر',
  content,
});

describe('removeTashkeel', () => {
  it('removes fatha (ـَ)', () => {
    expect(removeTashkeel('كَتَبَ')).toBe('كتب');
  });

  it('removes kasra (ـِ)', () => {
    expect(removeTashkeel('بِسْمِ')).toBe('بسم');
  });

  it('removes damma (ـُ)', () => {
    expect(removeTashkeel('يَكْتُبُ')).toBe('يكتب');
  });

  it('removes shadda (ـّ)', () => {
    expect(removeTashkeel('مُحَمَّد')).toBe('محمد');
  });

  it('removes sukun (ـْ)', () => {
    expect(removeTashkeel('عَلْم')).toBe('علم');
  });

  it('removes tanwin fath (ـً)', () => {
    expect(removeTashkeel('كِتَابًا')).toBe('كتابا');
  });

  it('leaves plain Arabic letters intact', () => {
    expect(removeTashkeel('شعر')).toBe('شعر');
  });

  it('returns empty string for empty input', () => {
    expect(removeTashkeel('')).toBe('');
  });

  it('strips all diacritics from a fully vowelled word', () => {
    expect(removeTashkeel('الرَّحِيمِ')).toBe('الرحيم');
  });

  it('leaves non-Arabic text unchanged', () => {
    expect(removeTashkeel('hello')).toBe('hello');
  });
});

describe('processPoemContent', () => {
  it('splits an even number of lines into verse pairs', () => {
    const { verses } = processPoemContent('أ*ب*ج*د');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', 'د'],
    ]);
  });

  it('handles an odd number of lines (last verse gets empty second half)', () => {
    const { verses } = processPoemContent('أ*ب*ج');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', ''],
    ]);
  });

  it('reports correct verseCount', () => {
    const { verseCount } = processPoemContent('أ*ب*ج*د');
    expect(verseCount).toBe(2);
  });

  it('strips double quotes from content', () => {
    const { verses } = processPoemContent('"أ"*"ب"');
    expect(verses).toEqual([['أ', 'ب']]);
  });

  it('builds sample from first three lines joined with " * "', () => {
    const { sample } = processPoemContent('أول*ثاني*ثالث*رابع');
    expect(sample).toBe('أول * ثاني * ثالث');
  });

  it('removes tashkeel from the sample', () => {
    const { sample } = processPoemContent('كَتَبَ*قَرَأَ');
    expect(sample).toBe('كتب * قرأ');
  });

  it('builds keywords from all lines without tashkeel', () => {
    const { keywords } = processPoemContent('كَلِمَة*أُخرى');
    expect(keywords).toBe('كلمة,أخرى');
  });

  it('uses empty string fallback when first half of a pair is empty', () => {
    // Content starting with '*' → lines[0] = '' (falsy) → '' fallback used for first half
    const { verses } = processPoemContent('*ب');
    expect(verses).toEqual([['', 'ب']]);
  });

  it('handles a single line (one verse with empty second half)', () => {
    const { verses, verseCount } = processPoemContent('بيت');
    expect(verses).toEqual([['بيت', '']]);
    expect(verseCount).toBe(1);
  });
});

describe('extractPoemExcerpt', () => {
  it('returns the two lines at startIndex plus the poet name', () => {
    const result = extractPoemExcerpt(makeRandomPoem('شطر أول*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('throws when poem has fewer than two lines', () => {
    expect(() => extractPoemExcerpt(makeRandomPoem('شطر واحد'), 0)).toThrow(
      'Poem has insufficient content for formatting'
    );
  });

  it('strips double quotes from output', () => {
    const result = extractPoemExcerpt(makeRandomPoem('"شطر أول"*"شطر ثانٍ"'), 0);
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('includes the poet name in the output', () => {
    const p: RandomPoemLines = { poem_id: asPoemId(2), poet_name: 'المتنبي', content: 'أ*ب' };
    expect(extractPoemExcerpt(p, 0)).toContain('المتنبي');
  });

  it('uses empty string fallback when lines[startIndex] is empty', () => {
    const result = extractPoemExcerpt(makeRandomPoem('*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result).toContain('شاعر');
  });

  it('uses empty string fallback when lines[startIndex + 1] is empty', () => {
    const result = extractPoemExcerpt(makeRandomPoem('شطر أول**شطر ثالث*شطر رابع'), 0);
    expect(result).toContain('شاعر');
  });

  it('returns a valid pair for any even startIndex in range', () => {
    const lines = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const content = lines.join('*');
    for (let startIndex = 0; startIndex < lines.length - 1; startIndex += 2) {
      const result = extractPoemExcerpt(makeRandomPoem(content), startIndex);
      expect(result).toBeTruthy();
      expect(result.split('\n').length).toBeGreaterThanOrEqual(2);
    }
  });
});

const POEM_CONTENT = 'شطر أول*شطر ثانٍ';

describe('listAllPoemSlugs', () => {
  it('returns all slugs and total count', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([{ slug: 'slug-1' }, { slug: 'slug-2' }])),
      }),
    });

    const result = await listAllPoemSlugs(mockDb);
    expect(result).toEqual(['slug-1', 'slug-2']);
  });

  it('returns empty slugs when no poems exist', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const result = await listAllPoemSlugs(mockDb);
    expect(result).toEqual([]);
  });
});

describe('getRandomPoemLines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns structured excerpt for a JSON object result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    const result = await getRandomPoemLines(mockDb);
    expect(result.lines[0]).toBe('شطر أول');
    expect(result.lines[1]).toBe('شطر ثانٍ');
    expect(result.poet).toBe('شاعر');
    expect(result.formatted).toContain('شطر أول');
    expect(result.formatted).toContain('شاعر');
  });

  it('parses a JSON string result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: JSON.stringify(poemData) }]),
    });

    const result = await getRandomPoemLines(mockDb);
    expect(result.formatted).toContain('شطر أول');
  });

  it('throws when execute returns empty array', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([]),
    });

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('SQL returned no eligible poem');
  });

  it('throws when get_random_eligible_poem is falsy', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: null }]),
    });

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('SQL returned no eligible poem');
  });

  it('throws when poem content is missing', async () => {
    const poemData = { poem_id: 1, poet_name: 'شاعر' };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow();
  });

  it('throws when excerpt exceeds MAX_TWEET_LENGTH', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const longLine = 'أ'.repeat(141);
    const poemData = {
      poem_id: 1,
      poet_name: 'شاعر',
      content: `${longLine}*${longLine}`,
    };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('exceeds MAX_TWEET_LENGTH');
  });
});

describe('getRandomPoemSlug', () => {
  it('returns slug from a valid response', async () => {
    const mockDb = fakeDb({
      execute: vi
        .fn()
        .mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 'test-slug-uuid' } }]),
    });

    const result = await getRandomPoemSlug(mockDb);
    expect(result).toBe('test-slug-uuid');
  });

  it('throws when execute returns empty array', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([]),
    });

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('SQL returned no eligible poem slug');
  });

  it('throws when get_random_eligible_poem_slug is null', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: null }]),
    });

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('SQL returned no eligible poem slug');
  });

  it('throws when value is not an object', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: 'just-a-string' }]),
    });

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('unexpected SQL payload shape');
  });

  it('throws when slug property is missing', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { other: 'field' } }]),
    });

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('unexpected SQL payload shape');
  });

  it('throws when slug is not a string', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 42 } }]),
    });

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('unexpected SQL payload shape');
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
  it('returns found result with enriched slugs for poem and related', async () => {
    const mockDb = fakeDb({
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
    expect(result.type).toBe('found');
    if (result.type === 'found') {
      expect(result.data.clearTitle).toBe('قصيدة المتنبي');
      expect(result.data.metadata.poetName).toBe('المتنبي');
      expect(result.data.metadata.meterSlug).toBe('altawil');
      expect(result.data.metadata.themeSlug).toBe('fakhr');
      expect(result.data.relatedPoems[0]?.poetSlug).toBe('other-poet');
      expect(result.data.relatedPoems[0]?.meterSlug).toBe('albasit');
    }
  });

  it('strips double quotes from title', async () => {
    const mockDb = fakeDb({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ get_poem_with_related: fullPoemData }])
        .mockResolvedValueOnce([{ slug: 'altawil' }])
        .mockResolvedValueOnce([{ slug: 'fakhr' }])
        .mockResolvedValueOnce([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('poem-slug'));
    if (result.type === 'found') {
      expect(result.data.clearTitle).not.toContain('"');
    }
  });

  it('returns not_found when execute returns empty array', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('missing-slug'));
    expect(result.type).toBe('not_found');
  });

  it('returns not_found when get_poem_with_related is falsy', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: null }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('missing-slug'));
    expect(result.type).toBe('not_found');
  });

  it('returns error type when data has error field with message', async () => {
    const mockDb = fakeDb({
      execute: vi
        .fn()
        .mockResolvedValue([
          { get_poem_with_related: { error: 'not_found', message: 'Poem not found' } },
        ]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Poem not found');
    }
  });

  it('falls back to error field when message is missing', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: { error: 'not_found' } }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('not_found');
    }
  });

  it('returns error type when poem is missing required fields', async () => {
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
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: incompleteData }]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Incomplete poem data');
    }
  });

  it('returns error when meter slug enrichment is missing', async () => {
    const mockDb = fakeDb({
      execute: vi
        .fn()
        .mockResolvedValueOnce([{ get_poem_with_related: fullPoemData }])
        .mockResolvedValueOnce([]) // meter lookup empty
        .mockResolvedValueOnce([{ slug: 'fakhr' }])
        .mockResolvedValueOnce([]),
    });

    const result = await getPoemBySlug(mockDb, asPoemSlug('slug'));
    expect(result.type).toBe('error');
  });
});
