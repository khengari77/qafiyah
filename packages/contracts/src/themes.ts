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
import { themeSlugSchema } from './brands';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .output(listResponse(statRowNoPoetsCount(themeSlugSchema)));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/poems' })
  .input(slugAndPageInput(themeSlugSchema, '61a2570d-9acc-493d-a05d-7dd2404c17ff'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(themeSlugSchema)));

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
