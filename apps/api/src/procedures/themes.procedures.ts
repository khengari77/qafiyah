import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { poemsQueries, themesQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { publicProcedure } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listThemes = publicProcedure.themes.list.handler(async ({ context, errors }) => {
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

// @NOTE: interim impl using get{Type}BySlug + listPoems; fully rewired in Tasks 5-7
export const listThemePoems = publicProcedure.themes.listPoems.handler(
  async ({ context, input, errors }) => {
    const themeResult = await themesQueries.getThemeBySlug(context.db, input.slug);
    if (themeResult.isErr()) {
      throw match(themeResult.error)
        .with({ kind: 'not_found' }, () => errors.NOT_FOUND())
        .otherwise(({ kind, ...rest }) => {
          context.log?.({ error_kind: kind, ...rest });
          return errors.INTERNAL_SERVER_ERROR();
        });
    }
    const theme = themeResult.value;
    const poemsResult = await poemsQueries.listPoems(
      context.db,
      { themeSlugs: [input.slug] },
      input.page
    );
    if (poemsResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const result = poemsResult.value;
    context.log?.({
      theme: input.slug,
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
      meta: theme,
    });
  }
);
