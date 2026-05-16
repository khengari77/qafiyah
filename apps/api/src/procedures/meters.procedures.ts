import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { metersQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listMeters = pub.meters.list.handler(async ({ context }) => {
  const meters = await metersQueries.listMeters(context.db);
  context.log?.({ result_count: meters.length });
  return listEnvelope(meters, meters.length, 1, meters.length || 1);
});

export const listMeterPoems = pub.meters.listPoems.handler(async ({ context, input, errors }) => {
  const result = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  context.log?.({
    meter: input.slug,
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
