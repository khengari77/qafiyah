import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { listResponse, poemListItem, resourceResponse, slugInput, subRef } from './_shared';

const listSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs' })
  .output(listResponse(v.string()));

const poemResource = v.object({
  title: v.string(),
  slug: v.string(),
  verses: v.array(v.tuple([v.string(), v.string()])),
  verseCount: v.number(),
  sample: v.string(),
  keywords: v.string(),
  poet: subRef,
  era: subRef,
  meter: subRef,
  theme: subRef,
  relatedPoems: v.array(poemListItem),
});

const getBySlugContract = oc
  .route({ method: 'GET', path: '/poems/{slug}' })
  .input(slugInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_PARSE_ERROR: { status: 500, message: 'Poem data could not be parsed' },
  })
  .output(resourceResponse(poemResource));

export const poemsContract = {
  listSlugs: listSlugsContract,
  getBySlug: getBySlugContract,
};
