import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { rhymesQueries } from '@qafiyah/db';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listRhymes = publicProcedure.rhymes.list.handler(async ({ context, errors }) => {
  const result = await rhymesQueries.listRhymes(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const rhymes = result.value;
  context.log?.({ result_count: rhymes.length });
  return listEnvelope({
    data: rhymes,
    totalItems: rhymes.length,
    page: 1,
    pageSize: rhymes.length || 1,
  });
});

export const listRhymePoems = publicProcedure.rhymes.listPoems.handler(
  async ({ context, input, errors }) => {
    const queryResult = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
    if (queryResult.isErr()) {
      if (queryResult.error.kind === 'not_found') throw errors.NOT_FOUND();
      throw errors.INTERNAL_SERVER_ERROR();
    }
    const result = queryResult.value;
    context.log?.({
      rhyme: input.slug,
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
