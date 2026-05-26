import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { metersQueries, poemsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
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

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listMeterPoems = publicProcedure.meters.listPoems.handler(
  async ({ context, input, errors }) => {
    const meterResult = await metersQueries.getMeterBySlug(context.db, input.slug);
    if (meterResult.isErr()) {
      throw match(meterResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const meter = meterResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { meterSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
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
      meta: { name: meter.name, slug: meter.slug, poemsCount: meter.poemsCount },
    });
  }
);
