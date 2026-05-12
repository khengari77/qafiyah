import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { poemListItemNoPoet, slugAndPageInput } from './_shared';

const listRhymesContract = oc.route({ method: 'GET', path: '/rhymes' }).output(
  v.array(
    v.object({
      id: v.number(),
      name: v.string(),
      slug: v.string(),
      poetsCount: v.number(),
      poemsCount: v.number(),
      totalUsage: v.number(),
    })
  )
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
        id: v.number(),
        pattern: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoPoet),
      totalPages: v.number(),
    })
  );

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
