import { describe, expect, it, vi } from 'vitest';
import { asRhymeSlug } from './brand';
import { getRhymeBySlug, listRhymes } from './rhymes.queries';
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

describe('getRhymeBySlug (integration)', () => {
  it('returns the matching rhyme stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getRhymeBySlug(db, asRhymeSlug('alef'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('alef');
      expect(typeof result.value.name).toBe('string');
      expect(result.value.poemsCount).toBeGreaterThan(0);
      expect(typeof result.value.poetsCount).toBe('number');
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getRhymeBySlug(db, asRhymeSlug('not-a-real-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
