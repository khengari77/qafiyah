import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { metersQueries } from '@qafiyah/db';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listMeters = publicProcedure.meters.list.handler(async ({ context }) => {
  const meters = await metersQueries.listMeters(context.db);
  context.log?.({ result_count: meters.length });
  return listEnvelope({
    data: meters,
    totalItems: meters.length,
    page: 1,
    pageSize: meters.length || 1,
  });
});

export const listMeterPoems = publicProcedure.meters.listPoems.handler(
  async ({ context, input, errors }) => {
    const queryResult = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
    if (queryResult.isErr()) throw errors.NOT_FOUND();
    const result = queryResult.value;
    context.log?.({
      meter: input.slug,
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
