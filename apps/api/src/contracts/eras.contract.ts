import { z } from 'zod';
import { erasQueries } from '../db';
import { pub } from './_base';

export const listEras = pub
  .route({ method: 'GET', path: '/eras' })
  .handler(({ context }) => erasQueries.listEras(context.db));

export const listEraPoems = pub
  .route({ method: 'GET', path: '/eras/{slug}/page/{page}' })
  .input(
    z.object({
      slug: z.string(),
      page: z.coerce.number().int().min(1),
    })
  )
  .errors({
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await erasQueries.listEraPoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });
