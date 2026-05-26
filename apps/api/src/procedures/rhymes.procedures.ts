import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poemsQueries, rhymesQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
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

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listRhymePoems = publicProcedure.rhymes.listPoems.handler(
  async ({ context, input, errors }) => {
    const rhymeResult = await rhymesQueries.getRhymeBySlug(context.db, input.slug);
    if (rhymeResult.isErr()) {
      throw match(rhymeResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const rhyme = rhymeResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { rhymeSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
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
      meta: { name: rhyme.name, slug: rhyme.slug, poemsCount: rhyme.poemsCount },
    });
  }
);
