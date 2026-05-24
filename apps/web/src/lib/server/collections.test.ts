import { ORPCError } from '@orpc/client';
import type { CollectionSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    collections: { list: vi.fn(), listPoems: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allCollections, getCollectionPoemsPage } from './collections';

const collectionsListMock = apiServer.collections.list as unknown as ReturnType<typeof vi.fn>;
const collectionsListPoemsMock = apiServer.collections.listPoems as unknown as ReturnType<
  typeof vi.fn
>;

const POEM = {
  title: 'ت',
  slug: 'p1',
  poet: { name: 'ش', slug: 'poet-x' },
  meter: { name: 'م', slug: 'meter-x' },
};
const PAGINATION = { page: 1, pageSize: 50, totalPages: 1, totalItems: 10 };

beforeEach(() => {
  collectionsListMock.mockReset();
  collectionsListPoemsMock.mockReset();
});

describe('allCollections', () => {
  it('returns the list data', async () => {
    collectionsListMock.mockResolvedValue({
      data: [{ name: 'المعلقات', slug: 'almuallaqat', poemsCount: 10 }],
      pagination: PAGINATION,
    });
    const collections = await allCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe('المعلقات');
  });
});

describe('getCollectionPoemsPage', () => {
  it('maps data/meta/pagination', async () => {
    collectionsListPoemsMock.mockResolvedValue({
      data: [POEM],
      pagination: PAGINATION,
      meta: { name: 'المعلقات', slug: 'almuallaqat', poemsCount: 10 },
    });
    const result = await getCollectionPoemsPage('almuallaqat' as CollectionSlug, 1);
    expect(result?.poems).toHaveLength(1);
    expect(result?.collection.slug).toBe('almuallaqat');
    expect(result?.pagination.totalPages).toBe(1);
  });

  it('returns null on NOT_FOUND (unknown slug)', async () => {
    collectionsListPoemsMock.mockRejectedValue(
      new ORPCError('NOT_FOUND', { defined: true, status: 404 })
    );
    expect(await getCollectionPoemsPage('missing' as CollectionSlug, 1)).toBeNull();
  });

  it('returns null when page is past the last page', async () => {
    collectionsListPoemsMock.mockResolvedValue({
      data: [],
      pagination: { page: 99, pageSize: 50, totalPages: 1, totalItems: 10 },
      meta: { name: 'المعلقات', slug: 'almuallaqat', poemsCount: 10 },
    });
    expect(await getCollectionPoemsPage('almuallaqat' as CollectionSlug, 99)).toBeNull();
  });
});
