import { rhymesQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listRhymes = pub.rhymes.list.handler(async ({ context }) => {
  const rhymes = await rhymesQueries.listRhymes(context.db);
  return { rhymes, page: 1, totalPages: 1, total: rhymes.length };
});

export const listRhymePoems = pub.rhymes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return { ...result, page: input.page };
});
