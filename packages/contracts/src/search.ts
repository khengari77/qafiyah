import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { pageParam } from './_shared';

const searchPagination = v.object({
  currentPage: v.number(),
  totalPages: v.number(),
  totalResults: v.number(),
  hasNextPage: v.boolean(),
  hasPrevPage: v.boolean(),
});

const poemsSearchResult = v.object({
  poet_name: v.string(),
  poet_era: v.string(),
  poet_slug: v.string(),
  poem_title: v.string(),
  poem_snippet: v.string(),
  poem_meter: v.string(),
  poem_slug: v.string(),
  relevance: v.number(),
  total_count: v.number(),
});

const poetsSearchResult = v.object({
  poet_name: v.string(),
  poet_era: v.string(),
  poet_slug: v.string(),
  poet_bio: v.string(),
  relevance: v.number(),
  total_count: v.number(),
});

const searchContract = oc
  .route({ method: 'GET', path: '/search' })
  .input(
    v.object({
      q: v.optional(v.string(), ''),
      search_type: v.picklist(['poems', 'poets']),
      page: v.optional(pageParam, 1),
      match_type: v.optional(v.string(), 'all'),
      meter_ids: v.optional(v.string()),
      era_ids: v.optional(v.string()),
      rhyme_ids: v.optional(v.string()),
      theme_ids: v.optional(v.string()),
    })
  )
  .errors({
    EMPTY_QUERY: { status: 400, message: 'لا نقل إلا الحروف العربية' },
  })
  .output(
    v.variant('search_type', [
      v.object({
        search_type: v.literal('poems'),
        results: v.array(poemsSearchResult),
        pagination: searchPagination,
      }),
      v.object({
        search_type: v.literal('poets'),
        results: v.array(poetsSearchResult),
        pagination: searchPagination,
      }),
    ])
  );

export const searchRouterContract = {
  search: searchContract,
};
