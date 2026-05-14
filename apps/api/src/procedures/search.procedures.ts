import { cleanArabicQuery, searchQueries } from '@qafiyah/db';
import { pub } from './_base';

const RESULTS_PER_POEMS_PAGE = 5;
const RESULTS_PER_POETS_PAGE = 10;

function paginate(currentPage: number, totalResults: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  return { page: currentPage, totalPages, total: totalResults };
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
      results: rows,
      ...paginate(input.page, totalCount, RESULTS_PER_POEMS_PAGE),
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
    results: rows,
    ...paginate(input.page, totalCount, RESULTS_PER_POETS_PAGE),
  };
});
