import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { erasQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listEras = publicProcedure.eras.list.handler(async ({ context, errors }) => {
  const result = await erasQueries.listEras(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const eras = result.value;
  context.log?.({ result_count: eras.length });
  return listEnvelope({
    data: eras,
    totalItems: eras.length,
    page: 1,
    pageSize: eras.length || 1,
  });
});

export const listEraPoems = publicProcedure.eras.listPoems.handler(
  async ({ context, input, errors }) => {
    const queryResult = await erasQueries.listEraPoems(context.db, input.slug, input.page);
    if (queryResult.isErr()) {
      throw match(queryResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .with({ kind: 'sql_error' }, ({ kind, message }) => {
          context.log?.({ error_kind: kind, error_detail: message });
          return errors.INTERNAL_SERVER_ERROR();
        })
        .with({ kind: 'invalid_payload_shape' }, ({ kind, issues }) => {
          context.log?.({ error_kind: kind, error_detail: issues.join('; ') });
          return errors.INTERNAL_SERVER_ERROR();
        })
        .exhaustive();
    }
    const result = queryResult.value;
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
  }
);
