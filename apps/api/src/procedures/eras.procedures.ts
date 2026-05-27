import { erasQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.eras.list.handler(async ({ context, errors }) => {
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

export const get = publicProcedure.eras.get.handler(async ({ context, input, errors }) => {
  const result = await erasQueries.getEraBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ era: input.slug });
  return { data: result.value };
});
