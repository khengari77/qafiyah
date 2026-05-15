import { oc } from '@orpc/contract';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './_shared';

const listRhymesContract = oc
  .route({ method: 'GET', path: '/rhymes' })
  .output(listResponse(statRow));

const listRhymePoemsContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}/poems' })
  .input(slugAndPageInput('464b68f4-d67b-40b2-9d85-21452b121b9a'))
  .errors({
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
