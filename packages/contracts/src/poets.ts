import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { poetSlugSchema } from './brands';
import { EXAMPLE_POET_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, pageQueryInput, slugInput, slugWithPoemCount } from './schemas';

const poetEntry = slugWithPoemCount(poetSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/poets' })
  .input(pageQueryInput)
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'No poets found for this page' },
  })
  .output(listResponse(poetEntry));

const getContract = oc
  .route({ method: 'GET', path: '/poets/{slug}' })
  .input(slugInput(poetSlugSchema, EXAMPLE_POET_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Poet not found' },
  })
  .output(v.object({ data: poetEntry }));

export const poetsContract = {
  list: listContract,
  get: getContract,
};
