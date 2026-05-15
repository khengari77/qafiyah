import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listPoetPoems, listPoets } from './poets.queries';

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

describe('listPoets', () => {
  it('returns poets with pagination info', async () => {
    const poetRows = [{ name: 'المتنبي', slug: 'al-mutanabbi', poemsCount: 200 }];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(poetRows)) }),
      $count: vi.fn().mockResolvedValue(1),
    } as unknown as DbClient;

    const result = await listPoets(mockDb, 1);
    expect(result.poets[0]?.name).toBe('المتنبي');
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns empty list when no poets exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
      $count: vi.fn().mockResolvedValue(0),
    } as unknown as DbClient;

    const result = await listPoets(mockDb, 1);
    expect(result.poets).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

describe('listPoetPoems', () => {
  it('returns poet details and poems on success', async () => {
    const poetInfoRow = { poetName: 'المتنبي', totalPoems: 50 };
    const poemRow = { title: 'قصيدة', slug: 'poem-slug', meter: 'الطويل' };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poetInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poemRow])) }),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'al-mutanabbi', 1);
    expect(result).not.toBeNull();
    expect(result?.poetDetails.name).toBe('المتنبي');
    expect(result?.total).toBe(50);
    expect(result?.poems[0]?.title).toBe('قصيدة');
  });

  it('returns null when poet is not found', async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const poetInfoRow = { poetName: 'شاعر', totalPoems: 31 };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poetInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'poet-slug', 1);
    expect(result?.totalPages).toBe(2); // ceil(31/30)
  });
});
