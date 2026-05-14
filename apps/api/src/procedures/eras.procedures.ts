import { erasQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listEras = pub.eras.list.handler(async ({ context }) => {
  const eras = await erasQueries.listEras(context.db);
  return { eras, page: 1, totalPages: 1, total: eras.length };
});

export const listEraPoems = pub.eras.listPoems.handler(async ({ context, input, errors }) => {
  const result = await erasQueries.listEraPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return { ...result, page: input.page };
});
