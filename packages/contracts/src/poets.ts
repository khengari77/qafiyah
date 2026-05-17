import { oc } from '@orpc/contract';
import { poetSlugSchema } from './brands/poet-slug';
import { EXAMPLE_POET_SLUG, inputValidationError } from './constants';
import { pageQueryInput, slugAndPageInput } from './shared/inputs';
import { parentMeta, poemListItem } from './shared/refs';
import { listResponse, listResponseWithMeta } from './shared/responses';

const poetStatRow = parentMeta(poetSlugSchema);

const listPoetsContract = oc
  .route({ method: 'GET', path: '/poets' })
  .input(pageQueryInput)
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .output(listResponse(poetStatRow));

const listPoetPoemsContract = oc
  .route({ method: 'GET', path: '/poets/{slug}/poems' })
  .input(slugAndPageInput(poetSlugSchema, EXAMPLE_POET_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(poetSlugSchema)));

export const poetsContract = {
  list: listPoetsContract,
  listPoems: listPoetPoemsContract,
};
