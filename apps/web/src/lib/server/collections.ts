import type { CollectionSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';
import { getOrNull, unwrap } from './unwrap';

export type Collection = ApiOutputs['collections']['get']['data'];

export const allCollections = (): Promise<ApiOutputs['collections']['list']['data']> =>
  unwrap(apiServer.collections.list());

export const getCollection = (slug: CollectionSlug): Promise<Collection | null> =>
  getOrNull(apiServer.collections.get({ slug }));
