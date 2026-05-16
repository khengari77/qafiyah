import { afterEach, describe, expect, it, vi } from 'vitest';
import { asPoemSlug } from '../utils/brand';
import { fakeDb, makeChain } from './_test-utils';
import {
  getPoemBySlug,
  getRandomPoemLines,
  getRandomPoemSlug,
  listAllPoemSlugs,
} from './poems.queries';

const POEM_CONTENT = 'شطر أول*شطر ثانٍ';

describe('listAllPoemSlugs', () => {
  it('returns all slugs and total count', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([{ slug: 'slug-1' }, { slug: 'slug-2' }])),
      }),
    });

    const result = await listAllPoemSlugs(mockDb);
    expect(result.slugs).toEqual(['slug-1', 'slug-2']);
    expect(result.total).toBe(2);
  });

  it('returns empty slugs when no poems exist', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const result = await listAllPoemSlugs(mockDb);
    expect(result.slugs).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('getRandomPoemLines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns formatted excerpt for a JSON object result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    });

    const result = await getRandomPoemLines(mockDb);
    expect(result).toContain('شطر أول');
    expect(result).toContain('شاعر');
  });

  it('parses a JSON string result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: JSON.stringify(poemData) }]),
    });

    const result = await getRandomPoemLines(mockDb);
    expect(result).toContain('شطر أول');
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

  it('throws when excerpt exceeds MAX_EXCERPT_LENGTH', async () => {
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

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('exceeds MAX_EXCERPT_LENGTH');
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
