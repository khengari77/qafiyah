import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { poemListItem, slugAndPageInput, statRow } from './_shared';

const listErasContract = oc.route({ method: 'GET', path: '/eras' }).output(v.array(statRow));

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(
    v.object({
      eraDetails: v.object({
        id: v.number(),
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItem),
      totalPages: v.number(),
    })
  );

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
