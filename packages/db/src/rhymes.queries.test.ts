import { describe, expect, it, vi } from 'vitest';
import { asRhymeSlug } from './brand';
import { listAllRhymePoems, listRhymePoems, listRhymes } from './rhymes.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listRhymes', () => {
  it('returns rhyme rows in id order, untouched', async () => {
    const rows = [
      { id: 10, letter: 'ب', slug: 'baa', name: 'باء', poemsCount: 30, poetsCount: 12 },
      { id: 14, letter: 'ح', slug: 'hha', name: 'حاء', poemsCount: 7, poetsCount: 4 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain(rows)),
      }),
    });

    const value = (await listRhymes(mockDb))._unsafeUnwrap();
    expect(value).toHaveLength(2);
    expect(value[0]).toMatchObject({ name: 'باء', slug: 'baa', poemsCount: 30, poetsCount: 12 });
    expect(value[1]).toMatchObject({ name: 'حاء', slug: 'hha', poemsCount: 7, poetsCount: 4 });
  });

  it('returns empty array when no rhymes exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(makeChain([])),
      }),
    });

    const value = (await listRhymes(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listRhymePoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'ميم', poems_count: 30 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'abcd',
      poet_name: 'شاعر',
      poet_slug: 'poet-a',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listRhymePoems(mockDb, asRhymeSlug('meem'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent.name).toBe('ميم');
    expect(value.poems[0]?.poetSlug).toBe('poet-a');
  });

  it('returns not_found err when rhyme is not found', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listRhymePoems(mockDb, asRhymeSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });
});

describe('listAllRhymePoems', () => {
  it('returns a Map keyed by rhyme slug containing all poems for that rhyme', async () => {
    await withTestDb(async (db) => {
      const result = await listAllRhymePoems(db);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      const map = result.value;
      expect(map.size).toBeGreaterThan(0);
      for (const [, poems] of map) {
        expect(poems.length).toBeGreaterThan(0);
        expect(poems[0]).toMatchObject({
          title: expect.any(String),
          slug: expect.any(String),
          poetName: expect.any(String),
          poetSlug: expect.any(String),
          meterName: expect.any(String),
          meterSlug: expect.any(String),
        });
      }
    });
  });
});
