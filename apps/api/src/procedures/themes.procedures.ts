import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { themesQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, listEnvelopeWithMeta } from './_envelope';
import { toPoemListItem } from './_mappers';

export const listThemes = pub.themes.list.handler(async ({ context }) => {
  const themes = await themesQueries.listThemes(context.db);
  context.log?.({ result_count: themes.length });
  return listEnvelope(themes, themes.length, 1, themes.length || 1);
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
  return listEnvelopeWithMeta(
    result.poems.map(toPoemListItem),
    result.total,
    input.page,
    POEMS_PER_PAGE,
    result.parent
  );
});
