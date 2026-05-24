import type { CollectionSlug } from '@qafiyah/contracts';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';

// TODO(Task 8): replace stubs with real collectionsQueries once @qafiyah/db exposes them.
export const listCollections = publicProcedure.collections.list.handler(() =>
  Promise.resolve(listEnvelope({ data: [], page: 1, pageSize: 1, totalItems: 0 }))
);

export const listCollectionPoems = publicProcedure.collections.listPoems.handler(() =>
  Promise.resolve(
    listEnvelopeWithMeta({
      data: [],
      page: 1,
      pageSize: 1,
      totalItems: 0,
      meta: { name: '', slug: '' as CollectionSlug, poemsCount: 0 },
    })
  )
);
