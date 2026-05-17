import type { EraSlug, PoetSlug } from '@qafiyah/contracts';
import type { searchQueries } from '@qafiyah/db';

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

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
