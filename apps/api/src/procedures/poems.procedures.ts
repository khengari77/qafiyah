import type { PoemSlug, poemDetail } from '@qafiyah/contracts';
import { poemsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import type * as v from 'valibot';
import { publicProcedure } from './base';
import { listEnvelope } from './envelope';
import { toPoemListItem } from './list-item.mapper';

type PoemDetailDto = v.InferOutput<typeof poemDetail>;

function toPoemDetail(slug: PoemSlug, data: poemsQueries.PoemDetail): PoemDetailDto {
  return {
    title: data.displayTitle,
    slug,
    verses: data.parsedContent.verses.map((verse) => [verse[0], verse[1]] as [string, string]),
    verseCount: data.parsedContent.verseCount,
    sample: data.parsedContent.sample,
    keywords: data.parsedContent.keywords,
    poet: { name: data.metadata.poetName, slug: data.metadata.poetSlug },
    era: { name: data.metadata.eraName, slug: data.metadata.eraSlug },
    meter: { name: data.metadata.meterName, slug: data.metadata.meterSlug },
    theme: { name: data.metadata.themeName, slug: data.metadata.themeSlug },
    relatedPoems: data.relatedPoems.map(toPoemListItem),
  };
}

export const listPoemSlugs = publicProcedure.poems.listPoemSlugs.handler(async ({ context }) => {
  const slugs = await poemsQueries.listAllPoemSlugs(context.db);
  context.log?.({ result_count: slugs.length });
  return listEnvelope({
    data: slugs,
    totalItems: slugs.length,
    page: 1,
    pageSize: slugs.length || 1,
  });
});

export const getPoemBySlug = publicProcedure.poems.getPoemBySlug.handler(
  async ({ context, input, errors }) => {
    const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
    return match(result)
      .with({ kind: 'not_found' }, () => {
        throw errors.NOT_FOUND();
      })
      .with({ kind: 'error' }, ({ message }) => {
        throw errors.POEM_PARSE_ERROR({ message });
      })
      .with({ kind: 'found' }, ({ data }) => {
        const poem = toPoemDetail(input.slug, data);
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
  }
);
