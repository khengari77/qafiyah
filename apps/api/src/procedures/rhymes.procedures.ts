import { rhymesQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listRhymes = pub.rhymes.list.handler(({ context }) =>
  rhymesQueries.listRhymes(context.db)
);

export const listRhymePoems = pub.rhymes.listPoems.handler(async ({ context, input, errors }) => {
  const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return result;
});
