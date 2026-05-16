import { oc } from '@orpc/contract';
import {
  inputValidationError,
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRowNoPoetsCount,
} from './_shared';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .output(listResponse(statRowNoPoetsCount));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/poems' })
  .input(slugAndPageInput('61a2570d-9acc-493d-a05d-7dd2404c17ff'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
