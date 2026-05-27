import { metersQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.meters.list.handler(async ({ context, errors }) => {
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

export const get = publicProcedure.meters.get.handler(async ({ context, input, errors }) => {
  const result = await metersQueries.getMeterBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ meter: input.slug });
  return { data: result.value };
});
