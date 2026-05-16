import * as v from 'valibot';

export const inputValidationError = {
  INPUT_VALIDATION_FAILED: { status: 400, message: 'Input validation failed' },
} as const;

export const pageParam = v.pipe(
  v.string(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.minValue(1)
);

export const slugInput = (example: string) =>
  v.object({ slug: v.pipe(v.string(), v.examples([example])) });

export const slugAndPageInput = (example: string) =>
  v.object({ slug: v.pipe(v.string(), v.examples([example])), page: v.optional(pageParam, '1') });

export const pageQueryInput = v.object({
  page: v.optional(pageParam, '1'),
});

export const subRef = v.object({
  name: v.string(),
  slug: v.string(),
});

export const statRow = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
  poetsCount: v.number(),
});

export const statRowNoPoetsCount = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
});

export const parentMeta = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
});

export const poemListItem = v.object({
  title: v.string(),
  slug: v.string(),
  poet: subRef,
  meter: subRef,
});

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
