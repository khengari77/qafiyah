import { describe, expect, it, vi } from 'vitest';

vi.mock('@qafiyah/db', () => ({
  createDb: vi.fn(),
  indexingQueries: {
    streamPoemBatch: vi.fn(),
    streamPoetBatch: vi.fn(),
    getPoemsBySlugs: vi.fn(),
    getPoetsBySlugs: vi.fn(),
  },
}));

import { ok } from 'neverthrow';
import { indexingQueries } from '@qafiyah/db';
import type { DbClient } from '@qafiyah/db';
import { poemDocFetcher, poemSourceKeys } from './sources';

const POEM_SOURCE = {
  id: 1,
  slug: 'test-slug',
  title: 'Test Title',
  content: 'Test Content',
  poetName: 'Test Poet',
  poetSlug: 'test-poet',
  eraName: 'Test Era',
  eraSlug: 'test-era',
  meterName: 'Test Meter',
  meterSlug: 'test-meter',
  themeSlug: 'test-theme',
  rhymeSlug: 'test-rhyme',
} as const;

function fakeDb(): DbClient {
  return {} as unknown as DbClient;
}

describe('poemDocFetcher', () => {
  it('returns PoemDocs with a hash field from a batch', async () => {
    vi.mocked(indexingQueries.streamPoemBatch).mockResolvedValueOnce(ok([POEM_SOURCE]));
    const fetcher = poemDocFetcher(fakeDb());
    const docs = await fetcher(0);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ slug: 'test-slug', poetSlug: 'test-poet' });
    expect(typeof docs[0]?.hash).toBe('string');
    expect(docs[0]?.hash.length).toBeGreaterThan(0);
  });

  it('throws when streamPoemBatch returns an error', async () => {
    vi.mocked(indexingQueries.streamPoemBatch).mockResolvedValueOnce(
      { isErr: () => true, error: { kind: 'sql_error', message: 'fail' } } as never,
    );
    const fetcher = poemDocFetcher(fakeDb());
    await expect(fetcher(0)).rejects.toThrow('streamPoemBatch');
  });
});

describe('poemSourceKeys', () => {
  it('builds a slug→hash map from batched results then stops at empty', async () => {
    vi.mocked(indexingQueries.streamPoemBatch)
      .mockResolvedValueOnce(ok([POEM_SOURCE]))
      .mockResolvedValueOnce(ok([]));
    const keys = await poemSourceKeys(fakeDb());
    expect(keys.size).toBe(1);
    expect(keys.has('test-slug')).toBe(true);
    expect(typeof keys.get('test-slug')).toBe('string');
  });

  it('returns an empty map when the first batch is empty', async () => {
    vi.mocked(indexingQueries.streamPoemBatch).mockResolvedValueOnce(ok([]));
    const keys = await poemSourceKeys(fakeDb());
    expect(keys.size).toBe(0);
  });
});
