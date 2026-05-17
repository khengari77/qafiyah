import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { themesQueries } from '@qafiyah/db';
import { pub } from './base';
import { listEnvelope, listEnvelopeWithMeta } from './envelope';
import { toPoemListItem } from './list-item.mapper';

export const listThemes = pub.themes.list.handler(async ({ context }) => {
  const themes = await themesQueries.listThemes(context.db);
  context.log?.({ result_count: themes.length });
  return listEnvelope({
    data: themes,
    totalItems: themes.length,
    page: 1,
    pageSize: themes.length || 1,
  });
});

export const listThemePoems = pub.themes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await themesQueries.listThemePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
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
    meta: result.parent,
  });
});
