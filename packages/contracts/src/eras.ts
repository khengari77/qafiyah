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

const listErasContract = oc.route({ method: 'GET', path: '/eras' }).output(listResponse(statRow));

const listEraPoemsContract = oc
  .route({ method: 'GET', path: '/eras/{slug}/poems' })
  .input(slugAndPageInput('abbasid'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const erasContract = {
  list: listErasContract,
  listPoems: listEraPoemsContract,
};
