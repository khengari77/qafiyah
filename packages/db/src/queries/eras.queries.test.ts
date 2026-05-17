import { describe, expect, it, vi } from 'vitest';
import { asEraSlug } from '../utils/brand';
import { listEraPoems, listEras } from './eras.queries';
import { fakeDb, makeChain } from './test-utils';

describe('listEras', () => {
  it('returns rows sorted by ERAS_SORT_ORDER', async () => {
    const rows = [
      { name: 'عباسي', slug: 'abbasid', poetsCount: 10, poemsCount: 100 },
      { name: 'جاهلي', slug: 'pre-islamic', poetsCount: 5, poemsCount: 50 },
    ];
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const result = await listEras(mockDb);
    expect(result[0]?.name).toBe('جاهلي');
    expect(result[1]?.name).toBe('عباسي');
  });

  it('returns empty array when no eras exist', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

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
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('abbasid'), 1);
    expect(result).not.toBeNull();
    expect(result?.parent).toEqual({ name: 'العصر العباسي', slug: 'abbasid', poemsCount: 50 });
    expect(result?.total).toBe(50);
    expect(result?.poems[0]?.poetSlug).toBe('al-mutanabbi');
    expect(result?.poems[0]?.meterSlug).toBe('taweel');
  });

  it('returns null when era stats lookup is empty', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('nonexistent'), 1);
    expect(result).toBeNull();
  });

  it('returns null when parent row is falsy', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([null]),
    });

    await expect(listEraPoems(mockDb, asEraSlug('test'), 1)).rejects.toThrow();
  });

  it('computes totalPages correctly', async () => {
    const parentRow = { name: 'العصر العباسي', poems_count: 90 };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('abbasid'), 1);
    expect(result?.totalPages).toBe(3);
  });

  it('coerces string poems_count to number', async () => {
    const parentRow = { name: 'x', poems_count: '42' };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([]),
    });

    const result = await listEraPoems(mockDb, asEraSlug('x'), 1);
    expect(result?.total).toBe(42);
  });
});
