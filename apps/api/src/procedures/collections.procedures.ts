import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { collectionsQueries, poemsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listCollections = publicProcedure.collections.list.handler(
  async ({ context, errors }) => {
    const result = await collectionsQueries.listCollections(context.db);
    if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const collections = result.value;
    context.log?.({ result_count: collections.length });
    return listEnvelope({
      data: collections,
      totalItems: collections.length,
      page: 1,
      pageSize: collections.length || 1,
    });
  }
);

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listCollectionPoems = publicProcedure.collections.listPoems.handler(
  async ({ context, input, errors }) => {
    const collectionResult = await collectionsQueries.getCollectionBySlug(context.db, input.slug);
    if (collectionResult.isErr()) {
      throw match(collectionResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const collection = collectionResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { collectionSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
    context.log?.({
      collection: input.slug,
      result_count: result.total,
      page: input.page,
      page_size: POEMS_PER_PAGE,
      total_pages: result.totalPages,
    });
    return listEnvelopeWithMeta({
      data: result.poems.map(toPoemListItem),
      totalItems: result.total,
      page: input.page,
      pageSize: POEMS_PER_PAGE,
      meta: collection,
    });
  }
);
