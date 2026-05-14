import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { pageParam, paginationFields, poemListItemNoPoet, slugAndPageInput } from './_shared';

const poetStatRow = v.object({
  name: v.string(),
  slug: v.string(),
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
      ...paginationFields,
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
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoPoet),
      ...paginationFields,
    })
  );

export const poetsContract = {
  list: listPoetsContract,
  listPoems: listPoetPoemsContract,
};
