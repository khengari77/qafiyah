import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { paginationFields, poemListItem, slugAndPageInput, statRow } from './_shared';

const listErasContract = oc.route({ method: 'GET', path: '/eras' }).output(
  v.object({
    eras: v.array(statRow),
    ...paginationFields,
  })
);

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(
    v.object({
      eraDetails: v.object({
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItem),
      ...paginationFields,
    })
  );

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
