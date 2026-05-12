import { z } from 'zod';
import { metersQueries } from '../db';
import { pub } from './_base';

export const listMeters = pub
  .route({ method: 'GET', path: '/meters' })
  .handler(({ context }) => metersQueries.listMeters(context.db));

export const listMeterPoems = pub
  .route({ method: 'GET', path: '/meters/{slug}/page/{page}' })
  .input(
    z.object({
      slug: z.string(),
      page: z.coerce.number().int().min(1),
    })
  )
  .errors({
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .handler(async ({ context, input, errors }) => {
    const result = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
    if (!result) throw errors.NOT_FOUND();
    return result;
  });
