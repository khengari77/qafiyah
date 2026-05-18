import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { rhymesQueries } from '@qafiyah/db';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listRhymes = publicProcedure.rhymes.list.handler(async ({ context }) => {
  const rhymes = await rhymesQueries.listRhymes(context.db);
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
    const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
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
