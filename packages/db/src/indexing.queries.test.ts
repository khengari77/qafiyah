import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from './client';
import { getPoemsBySlugs, streamPoemBatch, streamPoetBatch } from './indexing.queries';

function mockDb(rows: readonly unknown[]) {
  return { execute: vi.fn(async () => rows as never) } as unknown as DbClient;
}

describe('indexing queries', () => {
  it('streamPoemBatch maps a joined row to PoemSource', async () => {
    const db = mockDb([
      {
        id: 1,
        slug: 's',
        title: 't',
        content: 'c',
        poet_name: 'pn',
        poet_slug: 'pslug',
        era_name: 'en',
        era_slug: 'es',
        meter_name: 'mn',
        meter_slug: 'ms',
        theme_slug: 'th',
        rhyme_slug: 'rh',
      },
    ]);
    const res = await streamPoemBatch(db, 0, 1000);
    expect(res._unsafeUnwrap()[0]).toMatchObject({
      id: 1,
      poetSlug: 'pslug',
      meterSlug: 'ms',
      themeSlug: 'th',
    });
  });

  it('streamPoetBatch maps a row to PoetSource', async () => {
    const db = mockDb([{ id: 2, slug: 'p', name: 'n', bio: 'b', era_name: 'e', era_slug: 'es' }]);
    expect((await streamPoetBatch(db, 0, 1000))._unsafeUnwrap()[0]).toMatchObject({
      id: 2,
      eraSlug: 'es',
    });
  });

  it('getPoemsBySlugs returns [] for empty input without querying', async () => {
    const db = mockDb([]);
    expect((await getPoemsBySlugs(db, []))._unsafeUnwrap()).toEqual([]);
  });

  it('streamPoemBatch returns err on db failure', async () => {
    const db = {
      execute: vi.fn(async () => {
        throw new Error('db connection failed');
      }),
    } as unknown as DbClient;
    const res = await streamPoemBatch(db, 0, 1000);
    expect(res.isErr()).toBe(true);
    expect(res._unsafeUnwrapErr().kind).toBe('sql_error');
  });

  it('getPoemsBySlugs maps multiple rows to PoemSource array', async () => {
    const db = mockDb([
      {
        id: 10,
        slug: 'slug-a',
        title: 'Title A',
        content: 'Content A',
        poet_name: 'Poet A',
        poet_slug: 'poet-a',
        era_name: 'Era A',
        era_slug: 'era-a',
        meter_name: 'Meter A',
        meter_slug: 'meter-a',
        theme_slug: 'theme-a',
        rhyme_slug: 'rhyme-a',
      },
      {
        id: 11,
        slug: 'slug-b',
        title: 'Title B',
        content: 'Content B',
        poet_name: 'Poet B',
        poet_slug: 'poet-b',
        era_name: 'Era B',
        era_slug: 'era-b',
        meter_name: 'Meter B',
        meter_slug: 'meter-b',
        theme_slug: '',
        rhyme_slug: '',
      },
    ]);
    const res = await getPoemsBySlugs(db, ['slug-a', 'slug-b']);
    const sources = res._unsafeUnwrap();
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ id: 10, slug: 'slug-a', poetSlug: 'poet-a' });
    expect(sources[1]).toMatchObject({ id: 11, slug: 'slug-b', themeSlug: '' });
  });
});
