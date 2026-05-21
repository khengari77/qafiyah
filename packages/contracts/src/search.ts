import { oc } from '@orpc/contract';
import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  NON_ARABIC_AND_SPACE_REGEX,
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
import { DEFAULT_PAGE, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { namedSlugRef, pageParam, pagination } from './schemas';

// Live-typing sanitizer kept for the web input (UX); not applied server-side.
export function sanitizeArabicInput(raw: string): string {
  return raw.replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(WHITESPACE_RUN_REGEX, ' ');
}

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

const optionalSlugs = <S extends v.GenericSchema<string, string>>(s: S) =>
  v.optional(v.array(s), []);

export const searchInputSchema = v.object({
  q: v.optional(v.pipe(v.string(), v.maxLength(MAX_QUERY_LENGTH), v.examples(['المتنبي'])), ''),
  types: v.optional(v.array(v.picklist(SEARCH_TYPE_VALUES)), [...SEARCH_TYPE_VALUES]),
  poemsPage: v.optional(pageParam, DEFAULT_PAGE),
  poetsPage: v.optional(pageParam, DEFAULT_PAGE),
  matchType: v.optional(v.picklist(MATCH_TYPE_VALUES), 'all'),
  poetSlugs: optionalSlugs(poetSlugSchema),
  eraSlugs: optionalSlugs(eraSlugSchema),
  meterSlugs: optionalSlugs(meterSlugSchema),
  rhymeSlugs: optionalSlugs(rhymeSlugSchema),
  themeSlugs: optionalSlugs(themeSlugSchema),
});

const poemsSection = v.object({ data: v.array(poemSearchResult), pagination });
const poetsSection = v.object({ data: v.array(poetSearchResult), pagination });

export const searchContract = {
  search: oc
    .route({ method: 'GET', path: '/search' })
    .input(searchInputSchema)
    .errors({ ...inputValidationErrorMap, ...internalServerErrorMap })
    .output(
      v.object({
        q: v.string(),
        poems: v.nullable(poemsSection),
        poets: v.nullable(poetsSection),
      })
    ),
};
