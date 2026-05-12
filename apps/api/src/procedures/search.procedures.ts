import { cleanArabicQuery, parseIds, searchQueries } from '../db';
import { pub } from './_base';

const RESULTS_PER_POEMS_PAGE = 5;
const RESULTS_PER_POETS_PAGE = 10;

type SearchPagination = {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type PoemsSearchResult = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poem_title: string;
  poem_snippet: string;
  poem_meter: string;
  poem_slug: string;
  relevance: number;
  total_count: number;
};

type PoetsSearchResult = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poet_bio: string;
  relevance: number;
  total_count: number;
};

export const search = pub.search.search.handler(async ({ context, input, errors }) => {
  const sanitizedQuery = decodeURIComponent(cleanArabicQuery(input.q));
  if (!sanitizedQuery) throw errors.EMPTY_QUERY();

  const meterIds = parseIds(input.meter_ids);
  const eraIds = parseIds(input.era_ids);
  const rhymeIds = parseIds(input.rhyme_ids);
  const themeIds = parseIds(input.theme_ids);

  const rawResults =
    input.search_type === 'poems'
      ? await searchQueries.searchPoems(
          context.db,
          sanitizedQuery,
          input.page,
          input.match_type,
          meterIds,
          eraIds,
          themeIds,
          rhymeIds
        )
      : await searchQueries.searchPoets(
          context.db,
          sanitizedQuery,
          input.page,
          input.match_type,
          eraIds
        );

  const results = rawResults || [];
  const resultsPerPage =
    input.search_type === 'poems' ? RESULTS_PER_POEMS_PAGE : RESULTS_PER_POETS_PAGE;

  if (results.length === 0) {
    const pagination: SearchPagination = {
      currentPage: input.page,
      totalPages: 0,
      totalResults: 0,
      hasNextPage: false,
      hasPrevPage: input.page > 1,
    };
    return input.search_type === 'poems'
      ? { search_type: 'poems', results: [], pagination }
      : { search_type: 'poets', results: [], pagination };
  }

  const totalResults =
    results[0]?.['total_count'] !== undefined ? Number(results[0]['total_count']) : 0;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const pagination: SearchPagination = {
    currentPage: input.page,
    totalPages,
    totalResults,
    hasNextPage: input.page < totalPages,
    hasPrevPage: input.page > 1,
  };

  if (input.search_type === 'poems') {
    const shaped: PoemsSearchResult[] = results.map((r) => ({
      poet_name: String(r['poet_name'] ?? ''),
      poet_era: String(r['poet_era'] ?? ''),
      poet_slug: String(r['poet_slug'] ?? ''),
      poem_title: String(r['poem_title'] ?? ''),
      poem_snippet: String(r['poem_snippet'] ?? ''),
      poem_meter: String(r['poem_meter'] ?? ''),
      poem_slug: String(r['poem_slug'] ?? ''),
      relevance: Number(r['relevance'] ?? 0),
      total_count: parseTotalCount(r['total_count']),
    }));
    return { search_type: 'poems', results: shaped, pagination };
  }

  const shaped: PoetsSearchResult[] = results.map((r) => ({
    poet_name: String(r['poet_name'] ?? ''),
    poet_era: String(r['poet_era'] ?? ''),
    poet_slug: String(r['poet_slug'] ?? ''),
    poet_bio: String(r['poet_bio'] ?? ''),
    relevance: Number(r['relevance'] ?? 0),
    total_count: parseTotalCount(r['total_count']),
  }));
  return { search_type: 'poets', results: shaped, pagination };
});

function parseTotalCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10) || 0;
  return 0;
}
