import { z } from 'zod';
import { poetsQueries } from '../db';
import { pub } from './_base';

export const listPoets = pub
  .route({ method: 'GET', path: '/poets/page/{page}' })
  .input(z.object({ page: z.coerce.number().int().min(1) }))
  .errors({
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await poetsQueries.listPoets(context.db, input.page);
    if (result.poets.length === 0) throw errors.NOT_FOUND();
    return result;
  });

export const getPoetBySlug = pub
  .route({ method: 'GET', path: '/poets/slug/{slug}' })
  .input(z.object({ slug: z.string() }))
  .errors({
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await poetsQueries.getPoetBySlug(context.db, input.slug);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });

export const listPoetPoems = pub
  .route({ method: 'GET', path: '/poets/{slug}/page/{page}' })
  .input(
    z.object({
      slug: z.string(),
      page: z.coerce.number().int().min(1),
    })
  )
  .errors({
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await poetsQueries.listPoetPoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });
