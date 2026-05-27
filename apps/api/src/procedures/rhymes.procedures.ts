import { rhymesQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.rhymes.list.handler(async ({ context, errors }) => {
  const result = await rhymesQueries.listRhymes(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const rhymes = result.value;
  context.log?.({ result_count: rhymes.length });
  return listEnvelope({
    data: rhymes,
    totalItems: rhymes.length,
    page: 1,
    pageSize: rhymes.length || 1,
  });
});

export const get = publicProcedure.rhymes.get.handler(async ({ context, input, errors }) => {
  const result = await rhymesQueries.getRhymeBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ rhyme: input.slug });
  return { data: result.value };
});
