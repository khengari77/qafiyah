import * as v from 'valibot';
import { DEFAULT_PAGE } from '../constants';

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
