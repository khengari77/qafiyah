import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import {
  getPoemBySlug,
  getRandomPoemLines,
  getRandomPoemSlug,
  listAllPoemSlugs,
} from './poems.queries';

function makeChain(data: unknown[]) {
  const p = Promise.resolve(data);
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  let chain: any;
  chain = {
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

const POEM_CONTENT = 'شطر أول*شطر ثانٍ';

describe('listAllPoemSlugs', () => {
  it('returns all slugs and total count', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([{ slug: 'slug-1' }, { slug: 'slug-2' }])),
      }),
    } as unknown as DbClient;

    const result = await listAllPoemSlugs(mockDb);
    expect(result.slugs).toEqual(['slug-1', 'slug-2']);
    expect(result.total).toBe(2);
  });

  it('returns empty slugs when no poems exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

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
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    } as unknown as DbClient;

    const result = await getRandomPoemLines(mockDb);
    expect(result).toContain('شطر أول');
    expect(result).toContain('شاعر');
  });

  it('parses a JSON string result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const poemData = { poem_id: 1, poet_name: 'شاعر', content: POEM_CONTENT };
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: JSON.stringify(poemData) }]),
    } as unknown as DbClient;

    const result = await getRandomPoemLines(mockDb);
    expect(result).toContain('شطر أول');
  });

  it('throws when execute returns empty array', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as DbClient;

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('SQL returned no eligible poem');
  });

  it('throws when get_random_eligible_poem is falsy', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: null }]),
    } as unknown as DbClient;

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('SQL returned no eligible poem');
  });

  it('throws when poem content is missing', async () => {
    const poemData = { poem_id: 1, poet_name: 'شاعر' };
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    } as unknown as DbClient;

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('poem missing content field');
  });

  it('throws when excerpt exceeds MAX_EXCERPT_LENGTH', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const longLine = 'أ'.repeat(141);
    const poemData = {
      poem_id: 1,
      poet_name: 'شاعر',
      content: `${longLine}*${longLine}`,
    };
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem: poemData }]),
    } as unknown as DbClient;

    await expect(getRandomPoemLines(mockDb)).rejects.toThrow('exceeds MAX_EXCERPT_LENGTH');
  });
});

describe('getRandomPoemSlug', () => {
  it('returns slug from a valid response', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 'test-slug-uuid' } }]),
    } as unknown as DbClient;

    const result = await getRandomPoemSlug(mockDb);
    expect(result).toBe('test-slug-uuid');
  });

  it('throws when execute returns empty array', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as DbClient;

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('SQL returned no eligible poem slug');
  });

  it('throws when get_random_eligible_poem_slug is null', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: null }]),
    } as unknown as DbClient;

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('SQL returned no eligible poem slug');
  });

  it('throws when value is not an object', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: 'just-a-string' }]),
    } as unknown as DbClient;

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('unexpected SQL payload shape');
  });

  it('throws when slug property is missing', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { other: 'field' } }]),
    } as unknown as DbClient;

    await expect(getRandomPoemSlug(mockDb)).rejects.toThrow('unexpected SQL payload shape');
  });

  it('throws when slug is not a string', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_random_eligible_poem_slug: { slug: 42 } }]),
    } as unknown as DbClient;

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
  it('returns found result with mapped data', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: fullPoemData }]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'poem-slug');
    expect(result.type).toBe('found');
    if (result.type === 'found') {
      expect(result.data.clearTitle).toBe('قصيدة المتنبي');
      expect(result.data.metadata.poetName).toBe('المتنبي');
      expect(result.data.relatedPoems[0].slug).toBe('related-slug');
    }
  });

  it('strips double quotes from title', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: fullPoemData }]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'poem-slug');
    if (result.type === 'found') {
      expect(result.data.clearTitle).not.toContain('"');
    }
  });

  it('returns not_found when execute returns empty array', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'missing-slug');
    expect(result.type).toBe('not_found');
  });

  it('returns not_found when get_poem_with_related is falsy', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: null }]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'missing-slug');
    expect(result.type).toBe('not_found');
  });

  it('returns error type when data has error field with message', async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { get_poem_with_related: { error: 'not_found', message: 'Poem not found' } },
        ]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'slug');
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Poem not found');
    }
  });

  it('falls back to error field when message is missing', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: { error: 'not_found' } }]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'slug');
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('not_found');
    }
  });

  it('returns error type when poem is missing required fields', async () => {
    const incompleteData = {
      poem: { slug: 'slug', title: '', content: 'a*b', poet_name: 'شاعر', poet_slug: 'poet' },
      related_poems: [],
    };
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ get_poem_with_related: incompleteData }]),
    } as unknown as DbClient;

    const result = await getPoemBySlug(mockDb, 'slug');
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Incomplete poem data');
    }
  });
});
