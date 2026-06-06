import { describe, expect, it } from 'vitest';
import { derivePagination } from './pagination';

describe('derivePagination', () => {
  const makeUrl = (page: number) => `/x?page=${page}`;

  it('marks both directions available on a middle page', () => {
    const view = derivePagination({ page: 3, totalPages: 5 }, makeUrl);
    expect(view.hasPrevPage).toBe(true);
    expect(view.hasNextPage).toBe(true);
    expect(view.prevPageUrl).toBe('/x?page=2');
    expect(view.nextPageUrl).toBe('/x?page=4');
  });

  it('disables prev on the first page', () => {
    const view = derivePagination({ page: 1, totalPages: 5 }, makeUrl);
    expect(view.hasPrevPage).toBe(false);
    expect(view.hasNextPage).toBe(true);
  });

  it('disables next on the last page', () => {
    const view = derivePagination({ page: 5, totalPages: 5 }, makeUrl);
    expect(view.hasPrevPage).toBe(true);
    expect(view.hasNextPage).toBe(false);
  });

  it('renders the header tip with Arabic digits', () => {
    const view = derivePagination({ page: 2, totalPages: 10 }, makeUrl);
    expect(view.headerTip).toBe('صـ ٢ من ١٠');
  });
});
