import { oc } from '@orpc/contract';
import { poetSlugSchema } from './brands';
import { EXAMPLE_POET_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  pageQueryInput,
  poemListItem,
  slugAndPageInput,
  slugWithPoemCount,
} from './schemas';

const poetListEntry = slugWithPoemCount(poetSlugSchema);

const listPoetsContract = oc
  .route({ method: 'GET', path: '/poets' })
  .input(pageQueryInput)
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .output(listResponse(poetListEntry));

const listPoetPoemsContract = oc
  .route({ method: 'GET', path: '/poets/{slug}/poems' })
  .input(slugAndPageInput(poetSlugSchema, EXAMPLE_POET_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(poetSlugSchema)));

export const poetsContract = {
  list: listPoetsContract,
  listPoems: listPoetPoemsContract,
};
