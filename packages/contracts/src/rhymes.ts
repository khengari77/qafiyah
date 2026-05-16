import { oc } from '@orpc/contract';
import {
  inputValidationError,
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './_shared';
import { rhymeSlugSchema } from './brands';

const listRhymesContract = oc
  .route({ method: 'GET', path: '/rhymes' })
  .output(listResponse(statRow(rhymeSlugSchema)));

const listRhymePoemsContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}/poems' })
  .input(slugAndPageInput(rhymeSlugSchema, '464b68f4-d67b-40b2-9d85-21452b121b9a'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(rhymeSlugSchema)));

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
