import { describe, expect, it, vi } from 'vitest';
import { asPoetSlug } from './brand';
import { listPoetPoems, listPoets } from './poets.queries';
import { castPartialAsDbClient, makeChain } from './test-utils';

describe('listPoets', () => {
  it('returns poets with pagination info', async () => {
    const poetRows = [{ name: 'المتنبي', slug: 'al-mutanabbi', poemsCount: 200 }];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(poetRows)) }),
      $count: vi.fn().mockResolvedValue(1),
    });

    const value = (await listPoets(mockDb, 1))._unsafeUnwrap();
    expect(value.poets[0]?.name).toBe('المتنبي');
    expect(value.total).toBe(1);
    expect(value.totalPages).toBe(1);
  });

  it('returns empty list when no poets exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
      $count: vi.fn().mockResolvedValue(0),
    });

    const value = (await listPoets(mockDb, 1))._unsafeUnwrap();
    expect(value.poets).toEqual([]);
    expect(value.total).toBe(0);
    expect(value.totalPages).toBe(0);
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
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listPoetPoems(mockDb, asPoetSlug('al-mutanabbi'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent.name).toBe('المتنبي');
    expect(value.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns not_found err when poet is not found', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listPoetPoems(mockDb, asPoetSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'شاعر', poems_count: 31 };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listPoetPoems(mockDb, asPoetSlug('poet-slug'), 1);
    expect(result._unsafeUnwrap().totalPages).toBe(2);
  });
});
