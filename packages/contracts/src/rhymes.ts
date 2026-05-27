import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { rhymeSlugSchema } from './brands';
import { EXAMPLE_RHYME_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, slugInput, slugWithCounts } from './schemas';

const rhymeEntry = slugWithCounts(rhymeSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/rhymes' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(rhymeEntry));

const getContract = oc
  .route({ method: 'GET', path: '/rhymes/{slug}' })
  .input(slugInput(rhymeSlugSchema, EXAMPLE_RHYME_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Rhyme not found' },
  })
  .output(v.object({ data: rhymeEntry }));

export const rhymesContract = {
  list: listContract,
  get: getContract,
};
