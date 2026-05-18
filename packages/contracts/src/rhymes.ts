import { oc } from '@orpc/contract';
import { rhymeSlugSchema } from './brands';
import { EXAMPLE_RHYME_SLUG, inputValidationErrorMap } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  poemListItem,
  slugAndPageInput,
  slugWithCounts,
  slugWithPoemCount,
} from './schemas';

const listRhymesContract = oc
  .route({ method: 'GET', path: '/rhymes' })
  .output(listResponse(slugWithCounts(rhymeSlugSchema)));

const listRhymePoemsContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}/poems' })
  .input(slugAndPageInput(rhymeSlugSchema, EXAMPLE_RHYME_SLUG))
  .errors({
    ...inputValidationErrorMap,
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(rhymeSlugSchema)));

export const rhymesContract = {
  list: listRhymesContract,
  listPoems: listRhymePoemsContract,
};
