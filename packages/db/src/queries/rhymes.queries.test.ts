import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listRhymePoems, listRhymes } from './rhymes.queries';

function makeChain(data: unknown[]) {
  const p = Promise.resolve(data);
  let chain: any;
  chain = {
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable for drizzle chain mock
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

describe('listRhymes', () => {
  it('groups rhymes by Arabic letter and sums counts', async () => {
    const rows = [
      { pattern: 'ب', slug: 'rhyme-b-slug', poemsCount: 10, poetsCount: 5 },
      { pattern: 'باء', slug: 'rhyme-ba-slug', poemsCount: 20, poetsCount: 8 },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    } as unknown as DbClient;

    const result = await listRhymes(mockDb);
    const baaGroup = result.find((r) => r.name === 'باء');
    expect(baaGroup).toBeDefined();
    expect(baaGroup?.poemsCount).toBe(30);
    expect(baaGroup?.poetsCount).toBe(13);
  });

  it('returns empty array when no rhymes exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listRhymes(mockDb);
    expect(result).toEqual([]);
  });

  it('ignores rhymes whose pattern does not match any letter', async () => {
    const rows = [{ pattern: 'xyz', slug: 'rhyme-xyz-slug', poemsCount: 5, poetsCount: 2 }];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    } as unknown as DbClient;

    const result = await listRhymes(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listRhymePoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'ب', poems_count: 30 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'شاعر',
      poet_slug: 'poet-1',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    } as unknown as DbClient;

    const result = await listRhymePoems(mockDb, 'rhyme-slug', 1);
    expect(result?.parent.name).toBe('ب');
    expect(result?.poems[0]?.poetSlug).toBe('poet-1');
  });

  it('returns null when rhyme is not found', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listRhymePoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });
});
