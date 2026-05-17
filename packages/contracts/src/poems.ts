import { oc } from '@orpc/contract';
import * as v from 'valibot';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  themeSlugSchema,
} from './brands';
import { EXAMPLE_POEM_SLUG, inputValidationError } from './constants';
import { listResponse, poemListItem, resourceResponse, slugInput, subRef } from './schemas';

const listSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs' })
  .output(listResponse(poemSlugSchema));

const poemResource = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  verses: v.array(v.tuple([v.string(), v.string()])),
  verseCount: v.number(),
  sample: v.string(),
  keywords: v.string(),
  poet: subRef(poetSlugSchema),
  era: subRef(eraSlugSchema),
  meter: subRef(meterSlugSchema),
  theme: subRef(themeSlugSchema),
  relatedPoems: v.array(poemListItem),
});

const getBySlugContract = oc
  .route({ method: 'GET', path: '/poems/{slug}' })
  .input(slugInput(poemSlugSchema, EXAMPLE_POEM_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_PARSE_ERROR: { status: 500, message: 'Poem data could not be parsed' },
  })
  .output(resourceResponse(poemResource));

export const poemsContract = {
  listSlugs: listSlugsContract,
  getBySlug: getBySlugContract,
};
