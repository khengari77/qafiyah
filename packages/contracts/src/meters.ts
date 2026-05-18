import { oc } from '@orpc/contract';
import { meterSlugSchema } from './brands';
import { EXAMPLE_METER_SLUG, inputValidationErrorMap } from './constants';
import {
  listResponse,
  listResponseWithMeta,
  poemListItem,
  slugAndPageInput,
  slugWithCounts,
  slugWithPoemCount,
} from './schemas';

const listMetersContract = oc
  .route({ method: 'GET', path: '/meters' })
  .output(listResponse(slugWithCounts(meterSlugSchema)));

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/poems' })
  .input(slugAndPageInput(meterSlugSchema, EXAMPLE_METER_SLUG))
  .errors({
    ...inputValidationErrorMap,
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(meterSlugSchema)));

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
