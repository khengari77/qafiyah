import { oc } from '@orpc/contract';
import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  NON_ARABIC_AND_SPACE_REGEX,
  SEARCH_EMPTY_INPUT_MESSAGE,
  SEARCH_TYPE_VALUES,
  WHITESPACE_RUN_REGEX,
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
import { DEFAULT_PAGE, inputValidationErrorMap } from './constants';
import { namedSlugRef, pageParam, pagination } from './schemas';

export function cleanArabicQuery(query: string): string {
  return query
    .trim()
    .replace(NON_ARABIC_AND_SPACE_REGEX, '')
    .replace(WHITESPACE_RUN_REGEX, ' ')
    .trim();
}

const meterSlugsSchema = v.optional(v.array(meterSlugSchema), []);
const eraSlugsSchema = v.optional(v.array(eraSlugSchema), []);
const rhymeSlugsSchema = v.optional(v.array(rhymeSlugSchema), []);
const themeSlugsSchema = v.optional(v.array(themeSlugSchema), []);

export const poemSearchResult = v.object({
  type: v.literal('poem'),
  title: v.string(),
  slug: poemSlugSchema,
  snippet: v.string(),
  poet: namedSlugRef(poetSlugSchema),
  meter: namedSlugRef(meterSlugSchema),
  era: namedSlugRef(eraSlugSchema),
  relevance: v.number(),
});

export const poetSearchResult = v.object({
  type: v.literal('poet'),
  name: v.string(),
  slug: poetSlugSchema,
  bio: v.string(),
  era: namedSlugRef(eraSlugSchema),
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
    meterSlugs: meterSlugsSchema,
    eraSlugs: eraSlugsSchema,
    rhymeSlugs: rhymeSlugsSchema,
    themeSlugs: themeSlugsSchema,
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

export const searchContract = {
  search: oc
    .route({ method: 'GET', path: '/search' })
    .input(searchInputSchema)
    .errors({ ...inputValidationErrorMap })
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
    ),
};
