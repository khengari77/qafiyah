import { oc } from '@orpc/contract';
import { eraSlugSchema } from './brands';
import { EXAMPLE_ERA_SLUG, inputValidationError } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './schemas';

const listErasContract = oc
  .route({ method: 'GET', path: '/eras' })
  .output(listResponse(statRow(eraSlugSchema)));

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/poems' })
  .input(slugAndPageInput(eraSlugSchema, EXAMPLE_ERA_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(eraSlugSchema)));

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
