import * as v from 'valibot';
import { meterSlugSchema, poemSlugSchema, poetSlugSchema } from './brands';
import { DEFAULT_PAGE } from './constants';

export const namedSlugRef = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
  });

export const slugWithCounts = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
    poetsCount: v.number(),
  });

export const slugWithPoemCount = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
  });

export const poemListItem = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  poet: namedSlugRef(poetSlugSchema),
  meter: namedSlugRef(meterSlugSchema),
});

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
    page: v.optional(pageParam, DEFAULT_PAGE),
  });

export const pageQueryInput = v.object({
  page: v.optional(pageParam, DEFAULT_PAGE),
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
