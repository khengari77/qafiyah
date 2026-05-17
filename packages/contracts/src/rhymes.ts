import { oc } from '@orpc/contract';
import { rhymeSlugSchema } from './brands';
import { EXAMPLE_RHYME_SLUG, inputValidationError } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './schemas';

const listRhymesContract = oc
  .route({ method: 'GET', path: '/rhymes' })
  .output(listResponse(statRow(rhymeSlugSchema)));

const listRhymePoemsContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}/poems' })
  .input(slugAndPageInput(rhymeSlugSchema, EXAMPLE_RHYME_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(rhymeSlugSchema)));

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
