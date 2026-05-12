import { z } from 'zod';
import { poemsQueries } from '../db';
import { pub } from './_base';

export const listSlugs = pub
  .route({ method: 'GET', path: '/poems/slugs' })
  .input(
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).optional().default(1000),
    })
  )
  .handler(({ context, input }) => poemsQueries.listPoemSlugs(context.db, input.page, input.limit));

export const listAllSlugs = pub
  .route({ method: 'GET', path: '/poems/slugs/all' })
  .handler(({ context }) => poemsQueries.listAllPoemSlugs(context.db));

export const getBySlug = pub
  .route({ method: 'GET', path: '/poems/slug/{slug}' })
  .input(z.object({ slug: z.string() }))
  .errors({
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_ERROR: { status: 400, message: 'Poem data invalid' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
    if (result.type === 'not_found') throw errors.NOT_FOUND();
    if (result.type === 'error') throw errors.POEM_ERROR({ message: result.message });
    return result.data;
  });
