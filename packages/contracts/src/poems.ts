import { oc } from '@orpc/contract';
import * as v from 'valibot';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  themeSlugSchema,
} from './brands';
import { EXAMPLE_POEM_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, namedSlugRef, poemListItem, resourceResponse, slugInput } from './schemas';

const listPoemSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(poemSlugSchema));

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

const getPoemBySlugContract = oc
  .route({ method: 'GET', path: '/poems/{slug}' })
  .input(slugInput(poemSlugSchema, EXAMPLE_POEM_SLUG))
  .errors({
    ...inputValidationErrorMap,
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_PARSE_ERROR: { status: 500, message: 'Poem data could not be parsed' },
  })
  .output(resourceResponse(poemDetail));

export const poemsContract = {
  listPoemSlugs: listPoemSlugsContract,
  getPoemBySlug: getPoemBySlugContract,
};
