import { oc } from '@orpc/contract';
import { eraSlugSchema } from './brands';
import { EXAMPLE_ERA_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  poemListItem,
  slugAndPageInput,
  slugWithCounts,
  slugWithPoemCount,
} from './schemas';

const listErasContract = oc
  .route({ method: 'GET', path: '/eras' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(slugWithCounts(eraSlugSchema)));

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/poems' })
  .input(slugAndPageInput(eraSlugSchema, EXAMPLE_ERA_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(eraSlugSchema)));

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
