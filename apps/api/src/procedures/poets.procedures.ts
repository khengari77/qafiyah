import { poetsQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listPoets = pub.poets.list.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoets(context.db, input.page);
  if (result.poets.length === 0) throw errors.NOT_FOUND();
  return result;
});

export const getPoetBySlug = pub.poets.getBySlug.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.getPoetBySlug(context.db, input.slug);
  if (!result) throw errors.NOT_FOUND();
  return result;
});

export const listPoetPoems = pub.poets.listPoems.handler(async ({ context, input, errors }) => {
  const result = await poetsQueries.listPoetPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return result;
});
