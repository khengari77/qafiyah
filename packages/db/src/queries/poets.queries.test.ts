import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listPoetPoems, listPoets } from './poets.queries';

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
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'المتنبي', poems_count: 50 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'المتنبي',
      poet_slug: 'al-mutanabbi',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'al-mutanabbi', 1);
    expect(result?.parent.name).toBe('المتنبي');
    expect(result?.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns null when poet is not found', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'شاعر', poems_count: 31 };
    const mockDb = {
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    } as unknown as DbClient;

    const result = await listPoetPoems(mockDb, 'poet-slug', 1);
    expect(result?.totalPages).toBe(2);
  });
});
