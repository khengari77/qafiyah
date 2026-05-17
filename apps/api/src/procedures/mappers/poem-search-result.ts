import type { EraSlug, MeterSlug, PoemSlug, PoetSlug } from '@qafiyah/contracts';
import type { searchQueries } from '@qafiyah/db';

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

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
