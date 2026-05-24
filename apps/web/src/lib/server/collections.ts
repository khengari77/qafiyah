import { safe } from '@orpc/client';
import type { CollectionSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type CollectionPoems = ApiOutputs['collections']['listPoems'];

export async function allCollections(): Promise<ApiOutputs['collections']['list']['data']> {
  const { error, data } = await safe(apiServer.collections.list());
  if (error) throw error;
  return data.data;
}

export async function getCollectionPoemsPage(
  slug: CollectionSlug,
  page: number
): Promise<{
  poems: CollectionPoems['data'];
  collection: CollectionPoems['meta'];
  pagination: CollectionPoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.collections.listPoems({ slug, page: String(page) }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, collection: data.meta, pagination: data.pagination };
}
