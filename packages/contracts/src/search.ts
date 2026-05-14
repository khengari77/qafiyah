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
  poetName: v.string(),
  poetEra: v.string(),
  poetSlug: v.string(),
  poemTitle: v.string(),
  poemSnippet: v.string(),
  poemMeter: v.string(),
  poemSlug: v.string(),
  relevance: v.number(),
});

const poetsSearchResult = v.object({
  poetName: v.string(),
  poetEra: v.string(),
  poetSlug: v.string(),
  poetBio: v.string(),
  relevance: v.number(),
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
