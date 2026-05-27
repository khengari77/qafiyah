import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { themeSlugSchema } from './brands';
import { EXAMPLE_THEME_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, slugInput, slugWithPoemCount } from './schemas';

const themeEntry = slugWithPoemCount(themeSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/themes' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(themeEntry));

const getContract = oc
  .route({ method: 'GET', path: '/themes/{slug}' })
  .input(slugInput(themeSlugSchema, EXAMPLE_THEME_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(v.object({ data: themeEntry }));

export const themesContract = {
  list: listContract,
  get: getContract,
};
