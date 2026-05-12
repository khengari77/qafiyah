import { erasQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listEras = pub.eras.list.handler(({ context }) => erasQueries.listEras(context.db));

export const listEraPoems = pub.eras.listPoems.handler(async ({ context, input, errors }) => {
  const result = await erasQueries.listEraPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return result;
});
