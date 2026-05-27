import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { meterSlugSchema } from './brands';
import { EXAMPLE_METER_SLUG, inputValidationErrorMap, internalServerErrorMap } from './constants';
import { listResponse, slugInput, slugWithCounts } from './schemas';

const meterEntry = slugWithCounts(meterSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/meters' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(meterEntry));

const getContract = oc
  .route({ method: 'GET', path: '/meters/{slug}' })
  .input(slugInput(meterSlugSchema, EXAMPLE_METER_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(v.object({ data: meterEntry }));

export const metersContract = {
  list: listContract,
  get: getContract,
};
