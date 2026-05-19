import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { metersQueries } from '@qafiyah/db';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listMeters = publicProcedure.meters.list.handler(async ({ context, errors }) => {
  const result = await metersQueries.listMeters(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const meters = result.value;
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
    if (queryResult.isErr()) {
      if (queryResult.error.kind === 'not_found') throw errors.NOT_FOUND();
      throw errors.INTERNAL_SERVER_ERROR();
    }
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
