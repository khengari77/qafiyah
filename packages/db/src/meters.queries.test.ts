import { describe, expect, it, vi } from 'vitest';
import { asMeterSlug } from './brand';
import { listAllMeterPoems, listMeterPoems, listMeters } from './meters.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listMeters', () => {
  it('returns meters in DB order', async () => {
    const rows = [
      { name: 'الطويل', slug: 'altawil', poemsCount: 100, poetsCount: 30, isFormal: true },
      { name: 'الوافر', slug: 'alwafir', poemsCount: 20, poetsCount: 5, isFormal: true },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listMeters(mockDb))._unsafeUnwrap();
    expect(value.length).toBe(2);
    expect(value[0]?.name).toBe('الطويل');
  });

  it('returns empty array when no meters exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listMeters(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listMeterPoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'الطويل', poems_count: 100 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'abcd',
      poet_name: 'شاعر',
      poet_slug: 'poet-a',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('altawil'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent).toEqual({ name: 'الطويل', slug: 'altawil', poemsCount: 100 });
    expect(value.poems[0]?.poetSlug).toBe('poet-a');
  });

  it('returns not_found err when meter is not found', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'الطويل', poems_count: 60 };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listMeterPoems(mockDb, asMeterSlug('altawil'), 2);
    expect(result._unsafeUnwrap().totalPages).toBe(2);
  });
});

describe('listAllMeterPoems', () => {
  it('returns a Map keyed by meter slug containing all poems for that meter', async () => {
    await withTestDb(async (db) => {
      const result = await listAllMeterPoems(db);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      const map = result.value;
      expect(map.size).toBeGreaterThan(0);
      for (const [, poems] of map) {
        expect(poems.length).toBeGreaterThan(0);
        expect(poems[0]).toMatchObject({
          title: expect.any(String),
          slug: expect.any(String),
          poetName: expect.any(String),
          poetSlug: expect.any(String),
          meterName: expect.any(String),
          meterSlug: expect.any(String),
        });
      }
    });
  });
});
