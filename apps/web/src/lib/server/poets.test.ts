import { ORPCError } from '@orpc/client';
import type { PoetSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poets: { list: vi.fn(), listPoems: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoetPoemsPage, getPoetsPage } from './poets';

const listMock = apiServer.poets.list as unknown as ReturnType<typeof vi.fn>;
const poemsMock = apiServer.poets.listPoems as unknown as ReturnType<typeof vi.fn>;
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };

beforeEach(() => {
  listMock.mockReset();
  poemsMock.mockReset();
});

describe('getPoetsPage', () => {
  it('maps poets + pagination', async () => {
    listMock.mockResolvedValue({
      data: [{ name: 'ش', slug: 'poet-x', poemsCount: 3 }],
      pagination: PAGINATION,
    });
    const result = await getPoetsPage(1);
    expect(result?.poets).toHaveLength(1);
    expect(result?.pagination.totalItems).toBe(1);
  });
  it('returns null on NOT_FOUND (page out of range)', async () => {
    listMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoetsPage(999)).toBeNull();
  });
});

describe('getPoetPoemsPage', () => {
  it('maps poems/poet/pagination', async () => {
    poemsMock.mockResolvedValue({
      data: [
        {
          title: 'ت',
          slug: 'p1',
          poet: { name: 'ش', slug: 'poet-x' },
          meter: { name: 'م', slug: 'meter-x' },
        },
      ],
      pagination: PAGINATION,
      meta: { name: 'ش', slug: 'poet-x', poemsCount: 3 },
    });
    const result = await getPoetPoemsPage('poet-x' as PoetSlug, 1);
    expect(result?.poet.slug).toBe('poet-x');
    expect(result?.poems).toHaveLength(1);
  });
  it('returns null on NOT_FOUND', async () => {
    poemsMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoetPoemsPage('missing' as PoetSlug, 1)).toBeNull();
  });
});
