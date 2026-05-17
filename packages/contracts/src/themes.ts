import { oc } from '@orpc/contract';
import { themeSlugSchema } from './brands';
import { EXAMPLE_THEME_SLUG, inputValidationError } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
} from './schemas';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .output(listResponse(parentMeta(themeSlugSchema)));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/poems' })
  .input(slugAndPageInput(themeSlugSchema, EXAMPLE_THEME_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(themeSlugSchema)));

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
