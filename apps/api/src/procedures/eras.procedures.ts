import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { erasQueries } from '@qafiyah/db';
import { pub } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './mappers/poem-list-item';

export const listEras = pub.eras.list.handler(async ({ context }) => {
  const eras = await erasQueries.listEras(context.db);
  context.log?.({ result_count: eras.length });
  return listEnvelope({
    data: eras,
    totalItems: eras.length,
    page: 1,
    pageSize: eras.length || 1,
  });
});

export const listEraPoems = pub.eras.listPoems.handler(async ({ context, input, errors }) => {
  const result = await erasQueries.listEraPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  context.log?.({
    era: input.slug,
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
});
