import { poemsQueries } from '@qafiyah/db';
import { pub } from './_base';
import { listEnvelope, resourceEnvelope } from './_envelope';
import { toPoemResource } from './_mappers';

export const listSlugs = pub.poems.listSlugs.handler(async ({ context }) => {
  const { slugs, total } = await poemsQueries.listAllPoemSlugs(context.db);
  return listEnvelope(slugs, total, 1, total || 1);
});

export const getBySlug = pub.poems.getBySlug.handler(async ({ context, input, errors }) => {
  const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
  if (result.type === 'not_found') throw errors.NOT_FOUND();
  if (result.type === 'error') throw errors.POEM_PARSE_ERROR({ message: result.message });
  return resourceEnvelope(toPoemResource(input.slug, result.data));
});
