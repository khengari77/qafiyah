import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '../client';
import { listMeterPoems, listMeters } from './meters.queries';

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

describe('listMeters', () => {
  it('returns meters sorted alphabetically in Arabic', async () => {
    const rows = [
      { name: 'الوافر', slug: 'alwafir', poemsCount: 20, poetsCount: 5 },
      { name: 'الطويل', slug: 'altawil', poemsCount: 100, poetsCount: 30 },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    } as unknown as DbClient;

    const result = await listMeters(mockDb);
    expect(result.length).toBe(2);
    expect(result[0]?.name).toBe('الطويل');
  });

  it('returns empty array when no meters exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listMeters(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listMeterPoems', () => {
  it('returns meter details and poems on success', async () => {
    const meterInfoRow = { meterName: 'الطويل', totalPoems: 100 };
    const poemRow = { title: 'قصيدة', slug: 'poem-slug', poetName: 'شاعر' };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([meterInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([poemRow])) }),
    } as unknown as DbClient;

    const result = await listMeterPoems(mockDb, 'altawil', 1);
    expect(result).not.toBeNull();
    expect(result?.meterDetails.name).toBe('الطويل');
    expect(result?.total).toBe(100);
    expect(result?.poems[0]?.title).toBe('قصيدة');
  });

  it('returns null when meter is not found', async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listMeterPoems(mockDb, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const meterInfoRow = { meterName: 'الطويل', totalPoems: 60 };
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([meterInfoRow])) })
        .mockReturnValueOnce({ from: vi.fn().mockReturnValue(makeChain([])) }),
    } as unknown as DbClient;

    const result = await listMeterPoems(mockDb, 'altawil', 2);
    expect(result?.totalPages).toBe(2); // ceil(60/30)
  });
});
