import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { erasQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listEras = pub.eras.list.handler(async ({ context }) => {
  const eras = await erasQueries.listEras(context.db);
  return listEnvelope(eras, eras.length, 1, eras.length || 1);
});

export const listEraPoems = pub.eras.listPoems.handler(async ({ context, input, errors }) => {
  const result = await erasQueries.listEraPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
