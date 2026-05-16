import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poetsQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listPoets = pub.poets.list.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoets(context.db, input.page);
  if (input.page > 1 && input.page > result.totalPages) throw errors.NOT_FOUND();
  context.log?.({
    result_count: result.total,
    page: input.page,
    page_size: POEMS_PER_PAGE,
    total_pages: result.totalPages,
  });
  return listEnvelope(result.poets, result.total, input.page, POEMS_PER_PAGE);
});

export const listPoetPoems = pub.poets.listPoems.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoetPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  context.log?.({
    poet_id: input.slug,
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
