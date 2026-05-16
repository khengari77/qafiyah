import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import { cleanArabicQuery, searchQueries } from '@qafiyah/db';
import { match } from 'ts-pattern';
import { pub } from './_base';
import { toPoemSearchResult, toPoetSearchResult } from './_mappers';

function pagination(currentPage: number, totalItems: number, pageSize: number) {
  return {
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    totalItems,
  };
}

function nonEmpty<T>(arr: readonly T[]): readonly T[] | null {
  return arr.length > 0 ? arr : null;
}

export const search = pub.search.search.handler(({ context, input }) => {
  const sanitizedQuery = cleanArabicQuery(input.q ?? '');
  const hasText = sanitizedQuery.length > 0;

  const meterSlugs = nonEmpty(input.meterSlugs);
  const eraSlugs = nonEmpty(input.eraSlugs);
  const themeSlugs = nonEmpty(input.themeSlugs);
  const rhymeSlugs = nonEmpty(input.rhymeSlugs);

  return match(input.searchType)
    .with('poems', async () => {
      const { rows, totalCount } = hasText
        ? await searchQueries.searchPoems(
            context.db,
            sanitizedQuery,
            input.page,
            input.matchType,
            meterSlugs,
            eraSlugs,
            themeSlugs,
            rhymeSlugs
          )
        : await searchQueries.listPoemsByFilters(
            context.db,
            input.page,
            meterSlugs,
            eraSlugs,
            themeSlugs,
            rhymeSlugs
          );
      context.log?.({
        query_text: sanitizedQuery || undefined,
        query_length: sanitizedQuery.length > 0 ? sanitizedQuery.length : undefined,
        results_count: rows.length,
        search_type: hasText ? 'fulltext' : undefined,
        normalization_applied: input.q === undefined ? undefined : sanitizedQuery !== input.q,
        page: input.page,
        page_size: SEARCH_POEMS_PER_PAGE,
        total_pages: Math.max(1, Math.ceil(totalCount / SEARCH_POEMS_PER_PAGE)),
      });
      return {
        searchType: 'poems' as const,
        data: rows.map(toPoemSearchResult),
        pagination: pagination(input.page, totalCount, SEARCH_POEMS_PER_PAGE),
      };
    })
    .with('poets', async () => {
      const { rows, totalCount } = hasText
        ? await searchQueries.searchPoets(
            context.db,
            sanitizedQuery,
            input.page,
            input.matchType,
            eraSlugs
          )
        : await searchQueries.listPoetsByFilters(context.db, input.page, eraSlugs);
      context.log?.({
        query_text: sanitizedQuery || undefined,
        query_length: sanitizedQuery.length > 0 ? sanitizedQuery.length : undefined,
        results_count: rows.length,
        search_type: hasText ? 'fulltext' : undefined,
        normalization_applied: input.q === undefined ? undefined : sanitizedQuery !== input.q,
        page: input.page,
        page_size: SEARCH_POETS_PER_PAGE,
        total_pages: Math.max(1, Math.ceil(totalCount / SEARCH_POETS_PER_PAGE)),
      });
      return {
        searchType: 'poets' as const,
        data: rows.map(toPoetSearchResult),
        pagination: pagination(input.page, totalCount, SEARCH_POETS_PER_PAGE),
      };
    })
    .exhaustive();
});
