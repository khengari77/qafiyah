import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { eraSlugSchema } from './brands';
import { EXAMPLE_ERA_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, slugInput, slugWithCounts } from './schemas';

const eraEntry = slugWithCounts(eraSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/eras' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(eraEntry));

const getContract = oc
  .route({ method: 'GET', path: '/eras/{slug}' })
  .input(slugInput(eraSlugSchema, EXAMPLE_ERA_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Era not found' },
  })
  .output(v.object({ data: eraEntry }));

export const erasContract = {
  list: listContract,
  get: getContract,
};
