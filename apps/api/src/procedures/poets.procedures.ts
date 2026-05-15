import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poetsQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listPoets = pub.poets.list.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoets(context.db, input.page);
  if (result.poets.length === 0) throw errors.NOT_FOUND();
  return listEnvelope(result.poets, result.total, input.page, POEMS_PER_PAGE);
});

export const listPoetPoems = pub.poets.listPoems.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoetPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
