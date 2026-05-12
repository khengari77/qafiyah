import { poemsQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listSlugs = pub.poems.listSlugs.handler(({ context, input }) =>
  poemsQueries.listPoemSlugs(context.db, input.page, input.limit)
);

export const listAllSlugs = pub.poems.listAllSlugs.handler(({ context }) =>
  poemsQueries.listAllPoemSlugs(context.db)
);

export const getBySlug = pub.poems.getBySlug.handler(async ({ context, input, errors }) => {
  const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
  if (result.type === 'not_found') throw errors.NOT_FOUND();
  if (result.type === 'error') throw errors.POEM_ERROR({ message: result.message });
  return result.data;
});
