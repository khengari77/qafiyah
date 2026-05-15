import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { paginationFields, poemListItemNoPoet, slugAndPageInput, statRow } from './_shared';

const listRhymesContract = oc.route({ method: 'GET', path: '/rhymes' }).output(
  v.object({
    rhymes: v.array(statRow),
    ...paginationFields,
  })
);

const listRhymePoemsContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(
    v.object({
      rhymeDetails: v.object({
        pattern: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoPoet),
      ...paginationFields,
    })
  );

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
