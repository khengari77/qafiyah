import { cleanArabicQuery, searchQueries } from '@qafiyah/db';
import { pub } from './_base';

const RESULTS_PER_POEMS_PAGE = 5;
const RESULTS_PER_POETS_PAGE = 10;

function paginate(currentPage: number, totalResults: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  return { page: currentPage, totalPages, total: totalResults };
}

export const search = pub.search.search.handler(async ({ context, input }) => {
  const sanitizedQuery = cleanArabicQuery(input.q);

  if (input.searchType === 'poems') {
    const { rows, totalCount } = await searchQueries.searchPoems(
      context.db,
      sanitizedQuery,
      input.page,
      input.matchType,
      input.meterSlugs.length > 0 ? input.meterSlugs : null,
      input.eraSlugs.length > 0 ? input.eraSlugs : null,
      input.themeSlugs.length > 0 ? input.themeSlugs : null,
      input.rhymeSlugs.length > 0 ? input.rhymeSlugs : null
    );
    return {
      searchType: 'poems' as const,
      results: rows,
      ...paginate(input.page, totalCount, RESULTS_PER_POEMS_PAGE),
    };
  }

  const { rows, totalCount } = await searchQueries.searchPoets(
    context.db,
    sanitizedQuery,
    input.page,
    input.matchType,
    input.eraSlugs.length > 0 ? input.eraSlugs : null
  );
  return {
    searchType: 'poets' as const,
    results: rows,
    ...paginate(input.page, totalCount, RESULTS_PER_POETS_PAGE),
  };
});
