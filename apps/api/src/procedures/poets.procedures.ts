import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poetsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.poets.list.handler(async ({ context, input, errors }) => {
  const queryResult = await poetsQueries.listPoets(
    context.db,
    input.page,
    input.era ? { eraSlug: input.era } : undefined
  );
  if (queryResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const result = queryResult.value;
  if (input.page > 1 && input.page > result.totalPages) throw errors.NOT_FOUND();
  context.log?.({
    result_count: result.total,
    page: input.page,
    page_size: POEMS_PER_PAGE,
    total_pages: result.totalPages,
  });
  return listEnvelope({
    data: result.poets,
    totalItems: result.total,
    page: input.page,
    pageSize: POEMS_PER_PAGE,
  });
});

export const get = publicProcedure.poets.get.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.getPoetBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ poet_id: input.slug });
  return { data: result.value };
});
