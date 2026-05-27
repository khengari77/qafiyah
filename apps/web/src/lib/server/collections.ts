import { safe } from '@orpc/client';
import type { CollectionSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Collection = ApiOutputs['collections']['get']['data'];

export async function allCollections(): Promise<ApiOutputs['collections']['list']['data']> {
  const { error, data } = await safe(apiServer.collections.list());
  if (error) throw error;
  return data.data;
}

export async function getCollection(slug: CollectionSlug): Promise<Collection | null> {
  const { error, data } = await safe(apiServer.collections.get({ slug }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}
