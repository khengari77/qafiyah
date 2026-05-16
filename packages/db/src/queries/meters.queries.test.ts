import { describe, expect, it, vi } from 'vitest';
import { asMeterSlug } from '../utils/brand';
import { fakeDb, makeChain } from './_test-utils';
import { listMeterPoems, listMeters } from './meters.queries';

describe('listMeters', () => {
  it('returns meters sorted alphabetically in Arabic', async () => {
    const rows = [
      { name: 'الوافر', slug: 'alwafir', poemsCount: 20, poetsCount: 5 },
      { name: 'الطويل', slug: 'altawil', poemsCount: 100, poetsCount: 30 },
    ];
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const result = await listMeters(mockDb);
    expect(result.length).toBe(2);
    expect(result[0]?.name).toBe('الطويل');
  });

  it('returns empty array when no meters exist', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const result = await listMeters(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listMeterPoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'الطويل', poems_count: 100 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'شاعر',
      poet_slug: 'poet-1',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('altawil'), 1);
    expect(result?.parent).toEqual({ name: 'الطويل', slug: 'altawil', poemsCount: 100 });
    expect(result?.poems[0]?.poetSlug).toBe('poet-1');
  });

  it('returns null when meter is not found', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('nonexistent'), 1);
    expect(result).toBeNull();
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'الطويل', poems_count: 60 };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('altawil'), 2);
    expect(result?.totalPages).toBe(2);
  });
});
