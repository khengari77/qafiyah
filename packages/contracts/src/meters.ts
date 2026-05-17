import { oc } from '@orpc/contract';
import { meterSlugSchema } from './brands/meter-slug';
import { EXAMPLE_METER_SLUG, inputValidationError } from './constants';
import { slugAndPageInput } from './shared/inputs';
import { parentMeta, poemListItem, statRow } from './shared/refs';
import { listResponse, listResponseWithMeta } from './shared/responses';

const listMetersContract = oc
  .route({ method: 'GET', path: '/meters' })
  .output(listResponse(statRow(meterSlugSchema)));

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/poems' })
  .input(slugAndPageInput(meterSlugSchema, EXAMPLE_METER_SLUG))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(meterSlugSchema)));

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
