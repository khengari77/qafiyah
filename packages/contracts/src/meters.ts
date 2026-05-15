import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { paginationFields, poemListItemNoMeter, slugAndPageInput, statRow } from './_shared';

const listMetersContract = oc.route({ method: 'GET', path: '/meters' }).output(
  v.object({
    meters: v.array(statRow),
    ...paginationFields,
  })
);

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(
    v.object({
      meterDetails: v.object({
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoMeter),
      ...paginationFields,
    })
  );

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
