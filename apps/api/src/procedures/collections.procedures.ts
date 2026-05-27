import { collectionsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.collections.list.handler(async ({ context, errors }) => {
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
});

export const get = publicProcedure.collections.get.handler(async ({ context, input, errors }) => {
  const result = await collectionsQueries.getCollectionBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ collection: input.slug });
  return { data: result.value };
});
