import { oc } from '@orpc/contract';
import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  NON_ARABIC_AND_SPACE_REGEX,
  SEARCH_TYPE_VALUES,
} from '@qafiyah/constants';
import * as v from 'valibot';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  rhymeSlugSchema,
  themeSlugSchema,
} from './brands';
import {
  DEFAULT_PAGE,
  inputValidationError,
  SEARCH_EMPTY_INPUT_MESSAGE,
  WHITESPACE_RUN_REGEX,
} from './constants';
import { pageParam, pagination, subRef } from './schemas';

export function cleanArabicQuery(q: string): string {
  return q.trim().replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(WHITESPACE_RUN_REGEX, ' ').trim();
}

const meterSlugsParam = v.optional(v.array(meterSlugSchema), []);
const eraSlugsParam = v.optional(v.array(eraSlugSchema), []);
const rhymeSlugsParam = v.optional(v.array(rhymeSlugSchema), []);
const themeSlugsParam = v.optional(v.array(themeSlugSchema), []);

const poemSearchResult = v.object({
  type: v.literal('poem'),
  title: v.string(),
  slug: poemSlugSchema,
  snippet: v.string(),
  poet: subRef(poetSlugSchema),
  meter: subRef(meterSlugSchema),
  era: subRef(eraSlugSchema),
  relevance: v.number(),
});

const poetSearchResult = v.object({
  type: v.literal('poet'),
  name: v.string(),
  slug: poetSlugSchema,
  bio: v.string(),
  era: subRef(eraSlugSchema),
  relevance: v.number(),
});

export const searchInputSchema = v.pipe(
  v.object({
    q: v.optional(
      v.pipe(
        v.string(),
        v.maxLength(MAX_QUERY_LENGTH),
        v.examples(['المتنبي']),
        v.transform(cleanArabicQuery)
      ),
      ''
    ),
    searchType: v.pipe(v.picklist(SEARCH_TYPE_VALUES), v.examples(['poems'])),
    page: v.optional(pageParam, DEFAULT_PAGE),
    matchType: v.optional(v.picklist(MATCH_TYPE_VALUES), 'all'),
    meterSlugs: meterSlugsParam,
    eraSlugs: eraSlugsParam,
    rhymeSlugs: rhymeSlugsParam,
    themeSlugs: themeSlugsParam,
  }),
  v.check((input) => {
    const hasText = input.q.length > 0;
    const hasFilters =
      input.meterSlugs.length +
        input.eraSlugs.length +
        input.themeSlugs.length +
        input.rhymeSlugs.length >
      0;
    return hasText || hasFilters;
  }, SEARCH_EMPTY_INPUT_MESSAGE)
);

const searchContract = oc
  .route({ method: 'GET', path: '/search' })
  .input(searchInputSchema)
  .errors({ ...inputValidationError })
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
