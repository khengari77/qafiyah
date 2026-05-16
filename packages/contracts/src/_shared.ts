import * as v from 'valibot';
import { meterSlugSchema, poemSlugSchema, poetSlugSchema } from './brands';

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

export const slugInput = <TSlug extends v.GenericSchema<string, string>>(
  slug: TSlug,
  example: string
) => v.object({ slug: v.pipe(slug, v.examples([example])) });

export const slugAndPageInput = <TSlug extends v.GenericSchema<string, string>>(
  slug: TSlug,
  example: string
) =>
  v.object({
    slug: v.pipe(slug, v.examples([example])),
    page: v.optional(pageParam, '1'),
  });

export const pageQueryInput = v.object({
  page: v.optional(pageParam, '1'),
});

export const subRef = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
  });

export const statRow = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
    poetsCount: v.number(),
  });

export const statRowNoPoetsCount = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
  });

export const parentMeta = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
  });

export const poemListItem = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  poet: subRef(poetSlugSchema),
  meter: subRef(meterSlugSchema),
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
