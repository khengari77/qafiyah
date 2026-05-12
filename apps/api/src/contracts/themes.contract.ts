import { z } from 'zod';
import { themesQueries } from '../db';
import { pub } from './_base';

export const listThemes = pub
  .route({ method: 'GET', path: '/themes' })
  .handler(({ context }) => themesQueries.listThemes(context.db));

export const listThemePoems = pub
  .route({ method: 'GET', path: '/themes/{slug}/page/{page}' })
  .input(
    z.object({
      slug: z.string(),
      page: z.coerce.number().int().min(1),
    })
  )
  .errors({
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await themesQueries.listThemePoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });
