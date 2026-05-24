import { describe, expect, it, vi } from 'vitest';
import { asEraSlug } from './brand';
import { listAllEraPoems, listEraPoems, listEras } from './eras.queries';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';

describe('listEras', () => {
  it('returns rows in DB order (sort_order delegated to DB)', async () => {
    const rows = [
      { name: 'جاهلي', slug: 'pre-islamic', poetsCount: 5, poemsCount: 50 },
      { name: 'عباسي', slug: 'abbasid', poetsCount: 10, poemsCount: 100 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listEras(mockDb))._unsafeUnwrap();
    expect(value[0]?.name).toBe('جاهلي');
    expect(value[1]?.name).toBe('عباسي');
  });

  it('returns empty array when no eras exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listEras(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listEraPoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'العصر العباسي', poems_count: 50 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'abcd',
      poet_name: 'المتنبي',
      poet_slug: 'almutanabbi',
      meter_name: 'الطويل',
      meter_slug: 'taweel',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('abbasid'), 1);
    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.parent).toEqual({ name: 'العصر العباسي', slug: 'abbasid', poemsCount: 50 });
    expect(value.total).toBe(50);
    expect(value.poems[0]?.poetSlug).toBe('almutanabbi');
    expect(value.poems[0]?.meterSlug).toBe('taweel');
  });

  it('returns not_found err when era stats lookup is empty', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('nonexistent'), 1);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });

  it('returns invalid_payload_shape err when parent row is falsy (valibot rejects null)', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([null]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('test'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('invalid_payload_shape');
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'العصر العباسي', poems_count: 90 };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('abbasid'), 1);
    expect(result._unsafeUnwrap().totalPages).toBe(3);
  });

  it('coerces string poems_count to number', async () => {
    const parentRow = { name: 'x', poems_count: '42' };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('x'), 1);
    expect(result._unsafeUnwrap().total).toBe(42);
  });
});

describe('listAllEraPoems', () => {
  it('returns a Map keyed by era slug containing all poems for that era', async () => {
    await withTestDb(async (db) => {
      const result = await listAllEraPoems(db);
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
