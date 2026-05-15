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
  it('returns era details and poems on success', async () => {
    const eraInfoRow = { eraName: 'العصر العباسي', totalPoems: 50 };
    const poemRow = { title: 'قصيدة', slug: 'poem-slug', poetName: 'شاعر', meter: 'الطويل' };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([eraInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poemRow])) }),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'abbasid', 1);
    expect(result).not.toBeNull();
    expect(result?.eraDetails.name).toBe('العصر العباسي');
    expect(result?.total).toBe(50);
    expect(result?.poems[0]?.title).toBe('قصيدة');
  });

  it('returns null when era is not found (empty array)', async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('returns null when eraInfo[0] is falsy (null first element)', async () => {
    const mockDb = {
      select: vi
        .fn()
        // biome-ignore lint/suspicious/noExplicitAny: testing null element scenario
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([null as any])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'test', 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const eraInfoRow = { eraName: 'العصر العباسي', totalPoems: 90 };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([eraInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listEraPoems(mockDb, 'abbasid', 1);
    expect(result?.totalPages).toBe(3); // ceil(90/30)
  });
});
