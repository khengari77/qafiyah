import { oc } from '@orpc/contract';
import {
  inputValidationError,
  listResponse,
  listResponseWithMeta,
  pageQueryInput,
  parentMeta,
  poemListItem,
  slugAndPageInput,
} from './_shared';
import { poetSlugSchema } from './brands';

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
  .input(slugAndPageInput(poetSlugSchema, 'abu-nawas'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(poetSlugSchema)));

export const poetsContract = {
  list: listPoetsContract,
  listPoems: listPoetPoemsContract,
};
