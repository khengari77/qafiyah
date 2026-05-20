import { ORPCError } from '@orpc/client';
import type { EraSlug, MeterSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    eras: { list: vi.fn(), listPoems: vi.fn() },
    meters: { list: vi.fn(), listPoems: vi.fn() },
    rhymes: { list: vi.fn(), listPoems: vi.fn() },
    themes: { list: vi.fn(), listPoems: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allEras, getEraPoemsPage, getMeterPoemsPage } from './collections';

const erasListMock = apiServer.eras.list as unknown as ReturnType<typeof vi.fn>;
const eraPoemsMock = apiServer.eras.listPoems as unknown as ReturnType<typeof vi.fn>;
const meterPoemsMock = apiServer.meters.listPoems as unknown as ReturnType<typeof vi.fn>;

const POEM = {
  title: 'ت',
  slug: 'p1',
  poet: { name: 'ش', slug: 'poet-x' },
  meter: { name: 'م', slug: 'meter-x' },
};
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };

beforeEach(() => {
  erasListMock.mockReset();
  eraPoemsMock.mockReset();
  meterPoemsMock.mockReset();
});

describe('allEras', () => {
  it('returns the list data', async () => {
    erasListMock.mockResolvedValue({
      data: [{ name: 'الجاهلي', slug: 'jahili', poemsCount: 31, poetsCount: 12 }],
      pagination: PAGINATION,
    });
    const eras = await allEras();
    expect(eras).toHaveLength(1);
    expect(eras[0]?.poetsCount).toBe(12);
  });
});

describe('getEraPoemsPage', () => {
  it('maps data/meta/pagination', async () => {
    eraPoemsMock.mockResolvedValue({
      data: [POEM],
      pagination: PAGINATION,
      meta: { name: 'الجاهلي', slug: 'jahili', poemsCount: 31 },
    });
    const result = await getEraPoemsPage('jahili' as EraSlug, 1);
    expect(result?.poems).toHaveLength(1);
    expect(result?.era.slug).toBe('jahili');
    expect(result?.pagination.totalPages).toBe(1);
  });

  it('returns null on NOT_FOUND (unknown slug)', async () => {
    eraPoemsMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getEraPoemsPage('missing' as EraSlug, 1)).toBeNull();
  });

  it('returns null when page is past the last page', async () => {
    eraPoemsMock.mockResolvedValue({
      data: [],
      pagination: { page: 99, pageSize: 30, totalPages: 2, totalItems: 31 },
      meta: { name: 'الجاهلي', slug: 'jahili', poemsCount: 31 },
    });
    expect(await getEraPoemsPage('jahili' as EraSlug, 99)).toBeNull();
  });
});

describe('getMeterPoemsPage', () => {
  it('maps meter meta', async () => {
    meterPoemsMock.mockResolvedValue({
      data: [POEM],
      pagination: PAGINATION,
      meta: { name: 'البسيط', slug: 'albasit', poemsCount: 31 },
    });
    const result = await getMeterPoemsPage('albasit' as MeterSlug, 1);
    expect(result?.meter.slug).toBe('albasit');
  });
});
