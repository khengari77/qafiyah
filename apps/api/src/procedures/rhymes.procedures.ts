import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { rhymesQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listRhymes = pub.rhymes.list.handler(async ({ context }) => {
  const rhymes = await rhymesQueries.listRhymes(context.db);
  return listEnvelope(rhymes, rhymes.length, 1, rhymes.length || 1);
});

export const listRhymePoems = pub.rhymes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
