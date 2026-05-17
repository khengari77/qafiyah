import { oc } from '@orpc/contract';
import { rhymeSlugSchema } from './brands/rhyme-slug';
import { EXAMPLE_RHYME_SLUG, inputValidationError } from './constants';
import { slugAndPageInput } from './shared/inputs';
import { parentMeta, poemListItem, statRow } from './shared/refs';
import { listResponse, listResponseWithMeta } from './shared/responses';

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
