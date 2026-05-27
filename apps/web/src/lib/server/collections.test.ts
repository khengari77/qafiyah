import { ORPCError } from '@orpc/client';
import type { CollectionSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    collections: { list: vi.fn(), get: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allCollections, getCollection } from './collections';

const collectionsListMock = apiServer.collections.list as unknown as ReturnType<typeof vi.fn>;
const collectionsGetMock = apiServer.collections.get as unknown as ReturnType<typeof vi.fn>;

const PAGINATION = { page: 1, pageSize: 50, totalPages: 1, totalItems: 10 };
const COLLECTION = { name: 'المعلقات', slug: 'almuallaqat' as CollectionSlug, poemsCount: 10 };

beforeEach(() => {
  collectionsListMock.mockReset();
  collectionsGetMock.mockReset();
});

describe('allCollections', () => {
  it('returns the list data', async () => {
    collectionsListMock.mockResolvedValue({
      data: [COLLECTION],
      pagination: PAGINATION,
    });
    const collections = await allCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe('المعلقات');
  });
});

describe('getCollection', () => {
  it('returns the unwrapped collection on success', async () => {
    collectionsGetMock.mockResolvedValue({ data: COLLECTION });
    const collection = await getCollection('almuallaqat' as CollectionSlug);
    expect(collection).toEqual(COLLECTION);
    expect(collectionsGetMock).toHaveBeenCalledWith({ slug: 'almuallaqat' });
  });

  it('returns null on NOT_FOUND', async () => {
    collectionsGetMock.mockRejectedValue(
      new ORPCError('NOT_FOUND', { defined: true, status: 404 })
    );
    expect(await getCollection('missing' as CollectionSlug)).toBeNull();
  });
});
