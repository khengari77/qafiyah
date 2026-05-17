import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { eraSlugSchema } from './brands/era-slug';
import { meterSlugSchema } from './brands/meter-slug';
import { poemSlugSchema } from './brands/poem-slug';
import { poetSlugSchema } from './brands/poet-slug';
import { themeSlugSchema } from './brands/theme-slug';
import { inputValidationError } from './shared/errors';
import { slugInput } from './shared/inputs';
import { poemListItem, subRef } from './shared/refs';
import { listResponse, resourceResponse } from './shared/responses';

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
  .input(slugInput(poemSlugSchema, '887d1dcd-fb04-4f09-a448-d08287dface0'))
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
