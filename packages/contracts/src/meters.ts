import { oc } from '@orpc/contract';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRow,
} from './_shared';

const listMetersContract = oc
  .route({ method: 'GET', path: '/meters' })
  .output(listResponse(statRow));

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/poems' })
  .input(slugAndPageInput('altawil'))
  .errors({
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
