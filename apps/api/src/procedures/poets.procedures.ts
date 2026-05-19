import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poetsQueries } from '@qafiyah/db';
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

export const listPoetPoems = publicProcedure.poets.listPoems.handler(
  async ({ context, input, errors }) => {
    const queryResult = await poetsQueries.listPoetPoems(context.db, input.slug, input.page);
    if (queryResult.isErr()) {
      if (queryResult.error.kind === 'not_found') throw errors.NOT_FOUND();
      throw errors.INTERNAL_SERVER_ERROR();
    }
    const result = queryResult.value;
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
      meta: result.parent,
    });
  }
);
