import { oc } from '@orpc/contract';
import { themeSlugSchema } from './brands/theme-slug';
import { EXAMPLE_THEME_SLUG, inputValidationError } from './constants';
import { slugAndPageInput } from './shared/inputs';
import { parentMeta, poemListItem } from './shared/refs';
import { listResponse, listResponseWithMeta } from './shared/responses';

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
