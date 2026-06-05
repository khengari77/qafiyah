import { POEMS_PER_PAGE, SITEMAP_POEMS_PER_SHARD } from '@qafiyah/constants';
import type { PoemSlug, poemDetail } from '@qafiyah/contracts';
import { poemsQueries } from '@qafiyah/db';
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
    verseCount: data.verseCount,
    sample: data.parsedContent.sample,
    keywords: data.parsedContent.keywords,
    poet: { name: data.metadata.poetName, slug: data.metadata.poetSlug },
    era: { name: data.metadata.eraName, slug: data.metadata.eraSlug },
    meter: { name: data.metadata.meterName, slug: data.metadata.meterSlug },
    theme: { name: data.metadata.themeName, slug: data.metadata.themeSlug },
    relatedPoems: data.relatedPoems.map(toPoemListItem),
  };
}

export const list = publicProcedure.poems.list.handler(async ({ context, input, errors }) => {
  const queryResult = await poemsQueries.listPoems(
    context.db,
    {
      poetSlugs: input.poet,
      eraSlugs: input.era,
      themeSlugs: input.theme,
      meterSlugs: input.meter,
      rhymeSlugs: input.rhyme,
      collectionSlugs: input.collection,
    },
    input.page
  );
  if (queryResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const result = queryResult.value;
  context.log?.({
    result_count: result.total,
    page: input.page,
    page_size: POEMS_PER_PAGE,
    total_pages: result.totalPages,
  });
  return listEnvelope({
    data: result.poems.map(toPoemListItem),
    totalItems: result.total,
    page: input.page,
    pageSize: POEMS_PER_PAGE,
  });
});

export const listSlugs = publicProcedure.poems.listSlugs.handler(
  async ({ context, input, errors }) => {
    const [slugsResult, countResult] = await Promise.all([
      poemsQueries.listPoemSlugs(context.db, input.page, SITEMAP_POEMS_PER_SHARD),
      poemsQueries.countPoems(context.db),
    ]);
    if (slugsResult.isErr() || countResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
    const slugs = slugsResult.value;
    context.log?.({ result_count: slugs.length, page: input.page });
    return listEnvelope({
      data: [...slugs],
      totalItems: countResult.value,
      page: input.page,
      pageSize: SITEMAP_POEMS_PER_SHARD,
    });
  }
);

export const count = publicProcedure.poems.count.handler(async ({ context, errors }) => {
  const result = await poemsQueries.countPoems(context.db);
  if (result.isErr()) throw errors.INTERNAL_SERVER_ERROR();
  const total = result.value;
  context.log?.({ result_count: total });
  return { data: { total } };
});

export const get = publicProcedure.poems.get.handler(async ({ context, input, errors }) => {
  const result = await poemsQueries.getPoemBySlug(context.db, input.slug);
  if (result.isErr()) {
    const e = result.error;
    if (e.kind === 'not_found') throw errors.NOT_FOUND();
    if (e.kind === 'sql_error') throw errors.POEM_PARSE_ERROR({ message: e.message });
    if (e.kind === 'invalid_payload_shape')
      throw errors.POEM_PARSE_ERROR({ message: e.issues.join('; ') });
    throw errors.POEM_PARSE_ERROR({ message: 'Incomplete poem data' });
  }
  const poem = toPoemDetail(input.slug, result.value);
  context.log?.({
    poem_id: input.slug,
    poet_id: poem.poet.slug,
    era: poem.era.slug,
    meter: poem.meter.slug,
    theme: poem.theme.slug,
  });
  return { data: poem };
});
