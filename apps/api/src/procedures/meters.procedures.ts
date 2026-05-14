import { metersQueries } from '@qafiyah/db';
import { pub } from './_base';

export const listMeters = pub.meters.list.handler(async ({ context }) => {
  const meters = await metersQueries.listMeters(context.db);
  return { meters, page: 1, totalPages: 1, total: meters.length };
});

export const listMeterPoems = pub.meters.listPoems.handler(async ({ context, input, errors }) => {
  const result = await metersQueries.listMeterPoems(context.db, input.slug, input.page);
  if (!result) throw errors.NOT_FOUND();
  return { ...result, page: input.page };
});
