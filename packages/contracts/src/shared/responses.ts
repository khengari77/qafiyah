import * as v from 'valibot';

export const pagination = v.object({
  page: v.number(),
  pageSize: v.number(),
  totalPages: v.number(),
  totalItems: v.number(),
});

export const listResponse = <TItem extends v.GenericSchema>(item: TItem) =>
  v.object({ data: v.array(item), pagination });

export const listResponseWithMeta = <TItem extends v.GenericSchema, TMeta extends v.GenericSchema>(
  item: TItem,
  meta: TMeta
) => v.object({ data: v.array(item), pagination, meta });

export const resourceResponse = <TItem extends v.GenericSchema>(item: TItem) =>
  v.object({ data: item });
