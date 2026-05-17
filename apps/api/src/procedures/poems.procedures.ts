import type { EraSlug, MeterSlug, PoemSlug, PoetSlug, ThemeSlug } from '@qafiyah/contracts';
import { poemsQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { pub } from './base';
import { listEnvelope } from './envelope';
import { type PoemListItem, toPoemListItem } from './list-item.mapper';

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

// @WARN: PoemResource is the wire output shape, `verses` and `relatedPoems` are
//   mutable arrays because the oRPC contract (Valibot InferOutput) does not preserve
//   readonly. Internally readonly data from @qafiyah/db is copied into a mutable
//   shape only at this boundary.
type PoemResource = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly verses: [string, string][];
  readonly verseCount: number;
  readonly sample: string;
  readonly keywords: string;
  readonly poet: SubRef<PoetSlug>;
  readonly era: SubRef<EraSlug>;
  readonly meter: SubRef<MeterSlug>;
  readonly theme: SubRef<ThemeSlug>;
  readonly relatedPoems: PoemListItem[];
};

function toPoemResource(slug: PoemSlug, data: poemsQueries.PoemResourceData): PoemResource {
  return {
    title: data.clearTitle,
    slug,
    verses: data.processedContent.verses.map((v) => [v[0], v[1]] as [string, string]),
    verseCount: data.processedContent.verseCount,
    sample: data.processedContent.sample,
    keywords: data.processedContent.keywords,
    poet: { name: data.metadata.poetName, slug: data.metadata.poetSlug },
    era: { name: data.metadata.eraName, slug: data.metadata.eraSlug },
    meter: { name: data.metadata.meterName, slug: data.metadata.meterSlug },
    theme: { name: data.metadata.themeName, slug: data.metadata.themeSlug },
    relatedPoems: data.relatedPoems.map(toPoemListItem),
  };
}

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
