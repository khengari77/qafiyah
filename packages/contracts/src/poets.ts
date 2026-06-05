import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { eraSlugSchema, poetSlugSchema } from './brands';
import {
  DEFAULT_PAGE,
  EXAMPLE_POET_SLUG,
  inputValidationErrorMap,
  internalServerErrorMap,
} from './constants';
import { listResponse, pageParam, slugInput, slugWithPoemCount } from './schemas';

const poetEntry = slugWithPoemCount(poetSlugSchema);

const listPoetsInput = v.object({
  page: v.optional(pageParam, DEFAULT_PAGE),
  era: v.optional(eraSlugSchema), // single — a poet has exactly one era
});

const listContract = oc
  .route({ method: 'GET', path: '/poets' })
  .input(listPoetsInput)
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
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
