import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import { cleanArabicQuery, searchQueries } from '@qafiyah/db';
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

function nonEmpty<T>(arr: T[]): T[] | null {
  return arr.length > 0 ? arr : null;
}

export const search = pub.search.search.handler(async ({ context, input }) => {
  const sanitizedQuery = cleanArabicQuery(input.q ?? '');
  const hasText = sanitizedQuery.length > 0;

  const meterSlugs = nonEmpty(input.meterSlugs);
  const eraSlugs = nonEmpty(input.eraSlugs);
  const themeSlugs = nonEmpty(input.themeSlugs);
  const rhymeSlugs = nonEmpty(input.rhymeSlugs);

  if (input.searchType === 'poems') {
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
    return {
      searchType: 'poems' as const,
      data: rows.map(toPoemSearchResult),
      pagination: pagination(input.page, totalCount, SEARCH_POEMS_PER_PAGE),
    };
  }

  const { rows, totalCount } = hasText
    ? await searchQueries.searchPoets(
        context.db,
        sanitizedQuery,
        input.page,
        input.matchType,
        eraSlugs
      )
    : await searchQueries.listPoetsByFilters(context.db, input.page, eraSlugs);

  return {
    searchType: 'poets' as const,
    data: rows.map(toPoetSearchResult),
    pagination: pagination(input.page, totalCount, SEARCH_POETS_PER_PAGE),
  };
});
