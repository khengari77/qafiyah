import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { erasQueries, poemsQueries } from '@qafiyah/db';
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

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listEraPoems = publicProcedure.eras.listPoems.handler(
  async ({ context, input, errors }) => {
    const eraResult = await erasQueries.getEraBySlug(context.db, input.slug);
    if (eraResult.isErr()) {
      throw match(eraResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const era = eraResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { eraSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
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
      meta: { name: era.name, slug: era.slug, poemsCount: era.poemsCount },
    });
  }
);
