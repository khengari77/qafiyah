import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poemsQueries, poetsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listPoets = publicProcedure.poets.list.handler(async ({ context, input, errors }) => {
  const queryResult = await poetsQueries.listPoets(context.db, input.page);
  if (queryResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const result = queryResult.value;
  if (input.page > 1 && input.page > result.totalPages) throw errors.NOT_FOUND();
  context.log?.({
    result_count: result.total,
    page: input.page,
    page_size: POEMS_PER_PAGE,
    total_pages: result.totalPages,
  });
  return listEnvelope({
    data: result.poets,
    totalItems: result.total,
    page: input.page,
    pageSize: POEMS_PER_PAGE,
  });
});

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listPoetPoems = publicProcedure.poets.listPoems.handler(
  async ({ context, input, errors }) => {
    const poetResult = await poetsQueries.getPoetBySlug(context.db, input.slug);
    if (poetResult.isErr()) {
      throw match(poetResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const poet = poetResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { poetSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
    context.log?.({
      poet_id: input.slug,
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
      meta: poet,
    });
  }
);
