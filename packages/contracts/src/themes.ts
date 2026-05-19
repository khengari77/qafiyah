import { oc } from '@orpc/contract';
import { themeSlugSchema } from './brands';
import { EXAMPLE_THEME_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  poemListItem,
  slugAndPageInput,
  slugWithPoemCount,
} from './schemas';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(slugWithPoemCount(themeSlugSchema)));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/poems' })
  .input(slugAndPageInput(themeSlugSchema, EXAMPLE_THEME_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(themeSlugSchema)));

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
