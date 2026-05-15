import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { metersQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listMeters = pub.meters.list.handler(async ({ context }) => {
  const meters = await metersQueries.listMeters(context.db);
  return listEnvelope(meters, meters.length, 1, meters.length || 1);
});

export const listMeterPoems = pub.meters.listPoems.handler(async ({ context, input, errors }) => {
  const result = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
