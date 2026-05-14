import { themesQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listThemes = pub.themes.list.handler(async ({ context }) => {
  const themes = await themesQueries.listThemes(context.db);
  return { themes, page: 1, totalPages: 1, total: themes.length };
});

export const listThemePoems = pub.themes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await themesQueries.listThemePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return { ...result, page: input.page };
});
