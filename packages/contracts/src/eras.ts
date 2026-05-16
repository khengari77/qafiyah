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
import { eraSlugSchema } from './brands';

const listErasContract = oc
  .route({ method: 'GET', path: '/eras' })
  .output(listResponse(statRow(eraSlugSchema)));

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/poems' })
  .input(slugAndPageInput(eraSlugSchema, 'abbasid'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(eraSlugSchema)));

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
