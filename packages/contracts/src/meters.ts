import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { poemListItemNoMeter, slugAndPageInput, statRow } from './_shared';

const listMetersContract = oc.route({ method: 'GET', path: '/meters' }).output(v.array(statRow));

const listMeterPoemsContract = oc
  .route({ method: 'GET', path: '/meters/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Meter not found' },
  })
  .output(
    v.object({
      meterDetails: v.object({
        id: v.number(),
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItemNoMeter),
      totalPages: v.number(),
    })
  );

export const metersContract = {
  list: listMetersContract,
  listPoems: listMeterPoemsContract,
};
