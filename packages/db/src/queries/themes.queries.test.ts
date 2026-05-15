import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listThemePoems, listThemes } from './themes.queries';

function makeChain(data: unknown[]) {
  const p = Promise.resolve(data);
  // biome-ignore lint/suspicious/noExplicitAny: test mock
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

describe('listThemes', () => {
  it('returns themes sorted by poemsCount descending', async () => {
    const rows = [
      { name: 'رثاء', slug: 'ritha', poemsCount: 10 },
      { name: 'غزل', slug: 'ghazal', poemsCount: 50 },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    } as unknown as DbClient;

    const result = await listThemes(mockDb);
    expect(result[0]?.name).toBe('غزل');
    expect(result[1]?.name).toBe('رثاء');
  });

  it('returns empty array when no themes exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listThemes(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listThemePoems', () => {
  it('returns theme details and poems on success', async () => {
    const themeInfoRow = { themeName: 'غزل', totalPoems: 40 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poetName: 'شاعر',
      meter: 'الطويل',
    };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([themeInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poemRow])) }),
    } as unknown as DbClient;

    const result = await listThemePoems(mockDb, 'ghazal-slug', 1);
    expect(result).not.toBeNull();
    expect(result?.themeDetails.name).toBe('غزل');
    expect(result?.total).toBe(40);
    expect(result?.poems[0]?.title).toBe('قصيدة');
  });

  it('returns null when theme is not found', async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listThemePoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });
});
