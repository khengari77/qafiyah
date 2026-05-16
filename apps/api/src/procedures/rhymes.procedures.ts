import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { rhymesQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listRhymes = pub.rhymes.list.handler(async ({ context }) => {
  const rhymes = await rhymesQueries.listRhymes(context.db);
  context.log?.({ result_count: rhymes.length });
  return listEnvelope(rhymes, rhymes.length, 1, rhymes.length || 1);
});

export const listRhymePoems = pub.rhymes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  context.log?.({
    rhyme: input.slug,
    result_count: result.total,
    page: input.page,
    page_size: POEMS_PER_PAGE,
    total_pages: Math.max(1, Math.ceil(result.total / POEMS_PER_PAGE)),
  });
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
