import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import type { poemSearchResult, poetSearchResult } from '@qafiyah/contracts';
import { searchQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import type * as v from 'valibot';
import { publicProcedure } from './base';
import { buildPagination } from './envelope';

type PoemSearchResult = v.InferOutput<typeof poemSearchResult>;
type PoetSearchResult = v.InferOutput<typeof poetSearchResult>;

function toPoemSearchResult(row: searchQueries.PoemSearchRow): PoemSearchResult {
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

function toPoetSearchResult(row: searchQueries.PoetSearchRow): PoetSearchResult {
  return {
    type: 'poet',
    name: row.poetName,
    slug: row.poetSlug,
    bio: row.poetBio,
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}

function arrayOrNull<T>(arr: readonly T[]): readonly T[] | null {
  return arr.length > 0 ? arr : null;
}

export const search = publicProcedure.search.search.handler(({ context, input, errors }) => {
  const query = input.q;
  const hasText = query.length > 0;

  const meterSlugs = arrayOrNull(input.meterSlugs);
  const eraSlugs = arrayOrNull(input.eraSlugs);
  const themeSlugs = arrayOrNull(input.themeSlugs);
  const rhymeSlugs = arrayOrNull(input.rhymeSlugs);

  return match(input.searchType)
    .with('poems', async () => {
      const queryResult = hasText
        ? await searchQueries.searchPoems({
            db: context.db,
            query,
            page: input.page,
            matchType: input.matchType,
            filters: { meterSlugs, eraSlugs, themeSlugs, rhymeSlugs },
          })
        : await searchQueries.browsePoemsByFilters({
            db: context.db,
            page: input.page,
            filters: { meterSlugs, eraSlugs, themeSlugs, rhymeSlugs },
          });
      if (queryResult.isErr()) {
        console.error(
          JSON.stringify({
            source: 'search.procedures',
            stage: hasText ? 'searchPoems' : 'browsePoemsByFilters',
            error: queryResult.error,
          })
        );
        throw errors.INTERNAL_SERVER_ERROR();
      }
      const { rows, totalCount } = queryResult.value;
      context.log?.({
        query_text: query || undefined,
        query_length: hasText ? query.length : undefined,
        result_count: rows.length,
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
      const queryResult = hasText
        ? await searchQueries.searchPoets({
            db: context.db,
            query,
            page: input.page,
            matchType: input.matchType,
            eraSlugs,
          })
        : await searchQueries.browsePoetsByFilters({
            db: context.db,
            page: input.page,
            eraSlugs,
          });
      if (queryResult.isErr()) {
        console.error(
          JSON.stringify({
            source: 'search.procedures',
            stage: hasText ? 'searchPoets' : 'browsePoetsByFilters',
            error: queryResult.error,
          })
        );
        throw errors.INTERNAL_SERVER_ERROR();
      }
      const { rows, totalCount } = queryResult.value;
      context.log?.({
        query_text: query || undefined,
        query_length: hasText ? query.length : undefined,
        result_count: rows.length,
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
