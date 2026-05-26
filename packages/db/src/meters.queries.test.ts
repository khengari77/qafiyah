import { describe, expect, it, vi } from 'vitest';
import { asMeterSlug } from './brand';
import { getMeterBySlug, listMeters } from './meters.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listMeters', () => {
  it('returns meters in DB order', async () => {
    const rows = [
      { name: 'الطويل', slug: 'altawil', poemsCount: 100, poetsCount: 30 },
      { name: 'الوافر', slug: 'alwafir', poemsCount: 20, poetsCount: 5 },
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

describe('getMeterBySlug (integration)', () => {
  it('returns the matching meter stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getMeterBySlug(db, asMeterSlug('almudare'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('almudare');
      expect(typeof result.value.name).toBe('string');
      expect(typeof result.value.poemsCount).toBe('number');
      expect(typeof result.value.poetsCount).toBe('number');
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getMeterBySlug(db, asMeterSlug('not-a-real-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
