import { poemsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { pub } from './base';
import { listEnvelope } from './envelope';
import { toPoemResource } from './mappers/poem-resource';

export const listSlugs = pub.poems.listSlugs.handler(async ({ context }) => {
  const slugs = await poemsQueries.listAllPoemSlugs(context.db);
  context.log?.({ result_count: slugs.length });
  return listEnvelope({
    data: slugs,
    totalItems: slugs.length,
    page: 1,
    pageSize: slugs.length || 1,
  });
});

export const getBySlug = pub.poems.getBySlug.handler(async ({ context, input, errors }) => {
  const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
  return match(result)
    .with({ type: 'not_found' }, () => {
      throw errors.NOT_FOUND();
    })
    .with({ type: 'error' }, ({ message }) => {
      throw errors.POEM_PARSE_ERROR({ message });
    })
    .with({ type: 'found' }, ({ data }) => {
      const poem = toPoemResource(input.slug, data);
      context.log?.({
        poem_id: input.slug,
        poet_id: poem.poet.slug,
        era: poem.era.slug,
        meter: poem.meter.slug,
        theme: poem.theme.slug,
      });
      return { data: poem };
    })
    .exhaustive();
});
