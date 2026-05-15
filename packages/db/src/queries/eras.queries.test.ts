import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listEraPoems, listEras } from './eras.queries';

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

describe('listEras', () => {
  it('returns rows sorted by ERAS_SORT_ORDER', async () => {
    const rows = [
      { name: 'عباسي', slug: 'abbasid', poetsCount: 10, poemsCount: 100 },
      { name: 'جاهلي', slug: 'pre-islamic', poetsCount: 5, poemsCount: 50 },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    } as unknown as DbClient;

    const result = await listEras(mockDb);
    expect(result[0]?.name).toBe('جاهلي');
    expect(result[1]?.name).toBe('عباسي');
  });

  it('returns empty array when no eras exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listEras(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listEraPoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'العصر العباسي', poems_count: 50 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'المتنبي',
      poet_slug: 'al-mutanabbi',
      meter_name: 'الطويل',
      meter_slug: 'taweel',
    };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'abbasid', 1);
    expect(result).not.toBeNull();
    expect(result?.parent).toEqual({ name: 'العصر العباسي', slug: 'abbasid', poemsCount: 50 });
    expect(result?.total).toBe(50);
    expect(result?.poems[0]?.poetSlug).toBe('al-mutanabbi');
    expect(result?.poems[0]?.meterSlug).toBe('taweel');
  });

  it('returns null when era stats lookup is empty', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('returns null when parent row is falsy', async () => {
    const mockDb = {
      // biome-ignore lint/suspicious/noExplicitAny: testing null element scenario
      execute: vi.fn().mockResolvedValueOnce([null as any]),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'test', 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'العصر العباسي', poems_count: 90 };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'abbasid', 1);
    expect(result?.totalPages).toBe(3);
  });

  it('coerces string poems_count to number', async () => {
    const parentRow = { name: 'x', poems_count: '42' };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'x', 1);
    expect(result?.total).toBe(42);
  });
});
