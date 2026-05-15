import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listThemePoems, listThemes } from './themes.queries';

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
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'غزل', poems_count: 40 };
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

    const result = await listThemePoems(mockDb, 'ghazal', 1);
    expect(result?.parent.name).toBe('غزل');
    expect(result?.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns null when theme is not found', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listThemePoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });
});
