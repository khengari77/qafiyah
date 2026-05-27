import { themesQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';

export const list = publicProcedure.themes.list.handler(async ({ context, errors }) => {
  const result = await themesQueries.listThemes(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const themes = result.value;
  context.log?.({ result_count: themes.length });
  return listEnvelope({
    data: themes,
    totalItems: themes.length,
    page: 1,
    pageSize: themes.length || 1,
  });
});

export const get = publicProcedure.themes.get.handler(async ({ context, input, errors }) => {
  const result = await themesQueries.getThemeBySlug(context.db, input.slug);
  if (result.isErr()) {
    throw match(result.error)
      .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
      .otherwise(({ kind, ...rest }) => {
        context.log?.({ error_kind: kind, ...rest });
        return errors.INTERNAL_SERVER_ERROR();
      });
  }
  context.log?.({ theme: input.slug });
  return { data: result.value };
});
