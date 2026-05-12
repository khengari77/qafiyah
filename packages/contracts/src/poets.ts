import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { pageParam, poemListItemNoPoet, slugAndPageInput, slugInput } from './_shared';

const poetStatRow = v.object({
  id: v.number(),
  name: v.string(),
  slug: v.string(),
  eraId: v.number(),
  poemsCount: v.number(),
});

const listPoetsContract = oc
  .route({ method: 'GET', path: '/poets/page/{page}' })
  .input(v.object({ page: pageParam }))
  .errors({
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .output(
    v.object({
      poets: v.array(poetStatRow),
      totalPoets: v.number(),
      totalPages: v.number(),
    })
  );

const getPoetBySlugContract = oc
  .route({ method: 'GET', path: '/poets/slug/{slug}' })
  .input(slugInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(
    v.object({
      poet: v.object({
        name: v.string(),
        poemsCount: v.number(),
        era: v.nullable(
          v.object({
            name: v.string(),
            slug: v.string(),
          })
        ),
      }),
    })
  );

const listPoetPoemsContract = oc
  .route({ method: 'GET', path: '/poets/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(
    v.object({
      poetDetails: v.object({
        id: v.number(),
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoPoet),
      totalPages: v.number(),
    })
  );

export const poetsContract = {
  list: listPoetsContract,
  getBySlug: getPoetBySlugContract,
  listPoems: listPoetPoemsContract,
};
