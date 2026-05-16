import { oc } from '@orpc/contract';
import {
  inputValidationError,
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './_shared';
import { meterSlugSchema } from './brands';

const listMetersContract = oc
  .route({ method: 'GET', path: '/meters' })
  .output(listResponse(statRow(meterSlugSchema)));

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/poems' })
  .input(slugAndPageInput(meterSlugSchema, 'altawil'))
  .errors({
    ...inputValidationError,
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta(meterSlugSchema)));

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
