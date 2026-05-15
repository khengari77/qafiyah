import { oc } from '@orpc/contract';
import * as v from 'valibot';
import {
  listResponse,
  listResponseWithMeta,
  pageQueryInput,
  parentMeta,
  poemListItem,
  slugAndPageInput,
} from './_shared';

const poetStatRow = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
});

const listPoetsContract = oc
  .route({ method: 'GET', path: '/poets' })
  .input(pageQueryInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .output(listResponse(poetStatRow));

const listPoetPoemsContract = oc
  .route({ method: 'GET', path: '/poets/{slug}/poems' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const poetsContract = {
  list: listPoetsContract,
  listPoems: listPoetPoemsContract,
};
