import { oc } from '@orpc/contract';
import * as v from 'valibot';
import {
  collectionSlugSchema,
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  rhymeSlugSchema,
  themeSlugSchema,
} from './brands';
import {
  DEFAULT_PAGE,
  EXAMPLE_POEM_SLUG,
  inputValidationErrorMap,
  internalServerErrorMap,
} from './constants';
import {
  listResponse,
  namedSlugRef,
  optionalSlugs,
  pageParam,
  pageQueryInput,
  poemListItem,
  slugInput,
} from './schemas';

const listPoemsInput = v.object({
  page: v.optional(pageParam, DEFAULT_PAGE),
  poet: optionalSlugs(poetSlugSchema),
  era: optionalSlugs(eraSlugSchema),
  theme: optionalSlugs(themeSlugSchema),
  meter: optionalSlugs(meterSlugSchema),
  rhyme: optionalSlugs(rhymeSlugSchema),
  collection: optionalSlugs(collectionSlugSchema),
});

const listContract = oc
  .route({ method: 'GET', path: '/poems' })
  .input(listPoemsInput)
  .errors({ ...inputValidationErrorMap, ...internalServerErrorMap })
  .output(listResponse(poemListItem));

const listSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs' })
  .input(pageQueryInput)
  .errors({ ...internalServerErrorMap })
  .output(v.object({ data: v.array(poemSlugSchema) }));

const countContract = oc
  .route({ method: 'GET', path: '/poems/count' })
  .errors({ ...internalServerErrorMap })
  .output(v.object({ data: v.object({ total: v.number() }) }));

export const poemDetail = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  verses: v.array(v.tuple([v.string(), v.string()])),
  verseCount: v.number(),
  sample: v.string(),
  keywords: v.string(),
  poet: namedSlugRef(poetSlugSchema),
  era: namedSlugRef(eraSlugSchema),
  meter: namedSlugRef(meterSlugSchema),
  theme: namedSlugRef(themeSlugSchema),
  relatedPoems: v.array(poemListItem),
});

const getContract = oc
  .route({ method: 'GET', path: '/poems/{slug}' })
  .input(slugInput(poemSlugSchema, EXAMPLE_POEM_SLUG))
  .errors({
    ...inputValidationErrorMap,
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_PARSE_ERROR: { status: 500, message: 'Poem data could not be parsed' },
  })
  .output(v.object({ data: poemDetail }));

export const poemsContract = {
  list: listContract,
  get: getContract,
  listSlugs: listSlugsContract,
  count: countContract,
};
