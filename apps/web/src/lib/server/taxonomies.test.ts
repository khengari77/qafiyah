import { ORPCError } from '@orpc/client';
import type { EraSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    eras: { list: vi.fn(), get: vi.fn() },
    meters: { list: vi.fn(), get: vi.fn() },
    rhymes: { list: vi.fn(), get: vi.fn() },
    themes: { list: vi.fn(), get: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allEras, getEra } from './taxonomies';

const erasListMock = apiServer.eras.list as unknown as ReturnType<typeof vi.fn>;
const eraGetMock = apiServer.eras.get as unknown as ReturnType<typeof vi.fn>;

const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };
const ERA = { name: 'الجاهلي', slug: 'jahili' as EraSlug, poemsCount: 31, poetsCount: 12 };

beforeEach(() => {
  erasListMock.mockReset();
  eraGetMock.mockReset();
});

describe('allEras', () => {
  it('returns the list data', async () => {
    erasListMock.mockResolvedValue({
      data: [ERA],
      pagination: PAGINATION,
    });
    const eras = await allEras();
    expect(eras).toHaveLength(1);
    expect(eras[0]?.poetsCount).toBe(12);
  });
});

describe('getEra', () => {
  it('returns the unwrapped era on success', async () => {
    eraGetMock.mockResolvedValue({ data: ERA });
    const era = await getEra('jahili' as EraSlug);
    expect(era).toEqual(ERA);
    expect(eraGetMock).toHaveBeenCalledWith({ slug: 'jahili' });
  });

  it('returns null on NOT_FOUND', async () => {
    eraGetMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getEra('missing' as EraSlug)).toBeNull();
  });
});
