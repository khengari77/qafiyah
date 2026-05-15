import { oc } from '@orpc/contract';
import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  SEARCH_TEXTS,
  SEARCH_TYPE_VALUES,
} from '@qafiyah/constants';
import * as v from 'valibot';
import { pageParam, pagination, subRef } from './_shared';

const slugArrayParam = v.optional(v.array(v.string()), []);

const poemSearchResult = v.object({
  type: v.literal('poem'),
  title: v.string(),
  slug: v.string(),
  snippet: v.string(),
  poet: subRef,
  meter: subRef,
  era: subRef,
  relevance: v.number(),
});

const poetSearchResult = v.object({
  type: v.literal('poet'),
  name: v.string(),
  slug: v.string(),
  bio: v.string(),
  era: subRef,
  relevance: v.number(),
});

const searchContract = oc
  .route({ method: 'GET', path: '/search' })
  .input(
    v.pipe(
      v.object({
        q: v.optional(
          v.pipe(v.string(), v.maxLength(MAX_QUERY_LENGTH), v.examples(['المتنبي'])),
          ''
        ),
        searchType: v.pipe(v.picklist(SEARCH_TYPE_VALUES), v.examples(['poems'])),
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
        data: v.array(poemSearchResult),
        pagination,
      }),
      v.object({
        searchType: v.literal('poets'),
        data: v.array(poetSearchResult),
        pagination,
      }),
    ])
  );

export const searchRouterContract = {
  search: searchContract,
};
