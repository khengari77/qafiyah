import { z } from 'zod';
import { rhymesQueries } from '../db';
import { pub } from './_base';

export const listRhymes = pub
  .route({ method: 'GET', path: '/rhymes' })
  .handler(({ context }) => rhymesQueries.listRhymes(context.db));

export const listRhymePoems = pub
  .route({ method: 'GET', path: '/rhymes/{slug}/page/{page}' })
  .input(
    z.object({
      slug: z.string(),
      page: z.coerce.number().int().min(1),
    })
  )
  .errors({
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await rhymesQueries.listRhymePoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });
