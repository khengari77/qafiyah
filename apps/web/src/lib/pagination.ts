import { toArabicDigits } from '@/lib/arabic';

type Pagination = {
  readonly page: number;
  readonly totalPages: number;
};

export type PaginationView = {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly nextPageUrl: string;
  readonly prevPageUrl: string;
  readonly headerTip: string;
};

/**
 * The pagination values every list page derives identically: prev/next state,
 * the prev/next URLs (built by the caller's `makeUrl`, since each route shapes
 * its own query string), and the Arabic-digit "page N of M" header tip.
 */
export function derivePagination(
  pagination: Pagination,
  makeUrl: (page: number) => string
): PaginationView {
  const pageNumber = pagination.page;
  const totalPages = pagination.totalPages;
  return {
    pageNumber,
    totalPages,
    hasNextPage: pageNumber < totalPages,
    hasPrevPage: pageNumber > 1,
    nextPageUrl: makeUrl(pageNumber + 1),
    prevPageUrl: makeUrl(pageNumber - 1),
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };
}
