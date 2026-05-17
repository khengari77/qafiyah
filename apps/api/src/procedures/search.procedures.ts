import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import type { EraSlug, MeterSlug, PoemSlug, PoetSlug } from '@qafiyah/contracts';
import { searchQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { pub } from './base';
import { buildPagination } from './envelope';

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

type PoetSearchResult = {
  readonly type: 'poet';
  readonly name: string;
  readonly slug: PoetSlug;
  readonly bio: string;
  readonly era: SubRef<EraSlug>;
  readonly relevance: number;
};

function toPoemSearchResult(row: searchQueries.PoemsSearchRow): PoemSearchResult {
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

function toPoetSearchResult(row: searchQueries.PoetsSearchRow): PoetSearchResult {
  return {
    type: 'poet',
    name: row.poetName,
    slug: row.poetSlug,
    bio: row.poetBio,
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}

function nonEmpty<T>(arr: readonly T[]): readonly T[] | null {
  return arr.length > 0 ? arr : null;
}

export const search = pub.search.search.handler(({ context, input }) => {
  const query = input.q;
  const hasText = query.length > 0;

  const meterSlugs = nonEmpty(input.meterSlugs);
  const eraSlugs = nonEmpty(input.eraSlugs);
  const themeSlugs = nonEmpty(input.themeSlugs);
  const rhymeSlugs = nonEmpty(input.rhymeSlugs);

  return match(input.searchType)
    .with('poems', async () => {
      const { rows, totalCount } = hasText
        ? await searchQueries.searchPoems({
            db: context.db,
            query,
            page: input.page,
            matchType: input.matchType,
            filters: { meterSlugs, eraSlugs, themeSlugs, rhymeSlugs },
          })
        : await searchQueries.listPoemsByFilters({
            db: context.db,
            page: input.page,
            filters: { meterSlugs, eraSlugs, themeSlugs, rhymeSlugs },
          });
      context.log?.({
        query_text: query || undefined,
        query_length: hasText ? query.length : undefined,
        results_count: rows.length,
        search_type: hasText ? 'fulltext' : undefined,
        page: input.page,
        page_size: SEARCH_POEMS_PER_PAGE,
        total_pages: Math.max(1, Math.ceil(totalCount / SEARCH_POEMS_PER_PAGE)),
      });
      return {
        searchType: 'poems' as const,
        data: rows.map(toPoemSearchResult),
        pagination: buildPagination({
          page: input.page,
          pageSize: SEARCH_POEMS_PER_PAGE,
          totalItems: totalCount,
        }),
      };
    })
    .with('poets', async () => {
      const { rows, totalCount } = hasText
        ? await searchQueries.searchPoets({
            db: context.db,
            query,
            page: input.page,
            matchType: input.matchType,
            eraSlugs,
          })
        : await searchQueries.listPoetsByFilters({
            db: context.db,
            page: input.page,
            eraSlugs,
          });
      context.log?.({
        query_text: query || undefined,
        query_length: hasText ? query.length : undefined,
        results_count: rows.length,
        search_type: hasText ? 'fulltext' : undefined,
        page: input.page,
        page_size: SEARCH_POETS_PER_PAGE,
        total_pages: Math.max(1, Math.ceil(totalCount / SEARCH_POETS_PER_PAGE)),
      });
      return {
        searchType: 'poets' as const,
        data: rows.map(toPoetSearchResult),
        pagination: buildPagination({
          page: input.page,
          pageSize: SEARCH_POETS_PER_PAGE,
          totalItems: totalCount,
        }),
      };
    })
    .exhaustive();
});
