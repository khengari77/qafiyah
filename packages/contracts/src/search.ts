import { oc } from '@orpc/contract';
import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  SEARCH_TEXTS,
  SEARCH_TYPE_VALUES,
} from '@qafiyah/constants';
import * as v from 'valibot';
import { pageParam, paginationFields } from './_shared';

const slugArrayParam = v.optional(v.array(v.string()), []);

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
    v.pipe(
      v.object({
        q: v.optional(v.pipe(v.string(), v.maxLength(MAX_QUERY_LENGTH)), ''),
        searchType: v.picklist(SEARCH_TYPE_VALUES),
        page: v.optional(pageParam, '1'),
        matchType: v.optional(v.picklist(MATCH_TYPE_VALUES), 'all'),
        meterSlugs: slugArrayParam,
        eraSlugs: slugArrayParam,
        rhymeSlugs: slugArrayParam,
        themeSlugs: slugArrayParam,
      }),
      v.check((input) => {
        const hasText = input.q.trim().length > 0;
        const hasFilters =
          input.meterSlugs.length +
            input.eraSlugs.length +
            input.themeSlugs.length +
            input.rhymeSlugs.length >
          0;
        return hasText || hasFilters;
      }, SEARCH_TEXTS.missingQueryOrFilterError)
    )
  )
  .output(
    v.variant('searchType', [
      v.object({
        searchType: v.literal('poems'),
        results: v.array(poemsSearchResult),
        ...paginationFields,
      }),
      v.object({
        searchType: v.literal('poets'),
        results: v.array(poetsSearchResult),
        ...paginationFields,
      }),
    ])
  );

export const searchRouterContract = {
  search: searchContract,
};
