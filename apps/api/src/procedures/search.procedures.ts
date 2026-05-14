import { cleanArabicQuery, searchQueries } from '@qafiyah/db';
import { pub } from './_base';

const RESULTS_PER_POEMS_PAGE = 5;
const RESULTS_PER_POETS_PAGE = 10;

function parseCsvNumbers(csv: string | undefined): number[] | null {
  if (!csv) return null;
  const ids = csv
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  return ids.length > 0 ? ids : null;
}

function makePagination(currentPage: number, totalResults: number, perPage: number) {
  const totalPages = Math.ceil(totalResults / perPage);
  return {
    currentPage,
    totalPages,
    totalResults,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

export const search = pub.search.search.handler(async ({ context, input, errors }) => {
  const sanitizedQuery = decodeURIComponent(cleanArabicQuery(input.q));
  if (!sanitizedQuery) throw errors.EMPTY_QUERY();

  if (input.search_type === 'poems') {
    const { rows, totalCount } = await searchQueries.searchPoems(
      context.db,
      sanitizedQuery,
      input.page,
      input.match_type,
      parseCsvNumbers(input.meter_ids),
      parseCsvNumbers(input.era_ids),
      parseCsvNumbers(input.theme_ids),
      parseCsvNumbers(input.rhyme_ids)
    );
    return {
      search_type: 'poems' as const,
      results: rows,
      pagination: makePagination(input.page, totalCount, RESULTS_PER_POEMS_PAGE),
    };
  }

  const { rows, totalCount } = await searchQueries.searchPoets(
    context.db,
    sanitizedQuery,
    input.page,
    input.match_type,
    parseCsvNumbers(input.era_ids)
  );
  return {
    search_type: 'poets' as const,
    results: rows,
    pagination: makePagination(input.page, totalCount, RESULTS_PER_POETS_PAGE),
  };
});
