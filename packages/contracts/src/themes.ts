import { oc } from '@orpc/contract';
import { themeSlugSchema } from './brands/theme-slug';
import { inputValidationError } from './shared/errors';
import { slugAndPageInput } from './shared/inputs';
import { parentMeta, poemListItem } from './shared/refs';
import { listResponse, listResponseWithMeta } from './shared/responses';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .output(listResponse(parentMeta(themeSlugSchema)));

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
