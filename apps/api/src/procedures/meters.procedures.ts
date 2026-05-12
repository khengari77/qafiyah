import { metersQueries } from '../db';
import { pub } from './_base';

export const listMeters = pub.meters.list.handler(({ context }) =>
  metersQueries.listMeters(context.db)
);

export const listMeterPoems = pub.meters.listPoems.handler(async ({ context, input, errors }) => {
  const result = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return result;
});
