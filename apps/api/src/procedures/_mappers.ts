import type { EraSlug, MeterSlug, PoemSlug, PoetSlug, ThemeSlug } from '@qafiyah/contracts';
import type { poemsQueries, searchQueries } from '@qafiyah/db';

type PoemRow = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poetName: string;
  readonly poetSlug: PoetSlug;
  readonly meterName: string;
  readonly meterSlug: MeterSlug;
};

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

type PoemListItem = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poet: SubRef<PoetSlug>;
  readonly meter: SubRef<MeterSlug>;
};

export function toPoemListItem(row: PoemRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  };
}

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

export function toPoemResource(slug: PoemSlug, data: poemsQueries.PoemResourceData): PoemResource {
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

type PoemSearchResult = {
  readonly type: 'poem';
  readonly title: string;
  readonly slug: PoemSlug;
  readonly snippet: string;
  readonly poet: SubRef<PoetSlug>;
  readonly meter: SubRef<MeterSlug>;
  readonly era: SubRef<EraSlug>;
  readonly relevance: number;
};

export function toPoemSearchResult(row: searchQueries.PoemsSearchRow): PoemSearchResult {
  return {
    type: 'poem',
    title: row.poemTitle,
    slug: row.poemSlug,
    snippet: row.poemSnippet,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.poemMeter, slug: row.poemMeterSlug },
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}

type PoetSearchResult = {
  readonly type: 'poet';
  readonly name: string;
  readonly slug: PoetSlug;
  readonly bio: string;
  readonly era: SubRef<EraSlug>;
  readonly relevance: number;
};

export function toPoetSearchResult(row: searchQueries.PoetsSearchRow): PoetSearchResult {
  return {
    type: 'poet',
    name: row.poetName,
    slug: row.poetSlug,
    bio: row.poetBio,
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}
