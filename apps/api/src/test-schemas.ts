/**
 * Minimal Valibot schemas used to validate response bodies in tests.
 * Replaces ad-hoc `(await res.json()) as ListBody` casts.
 */

import * as v from 'valibot';

const slug = v.string();

const paginationSchema = v.object({
  page: v.number(),
  pageSize: v.number(),
  totalPages: v.number(),
  totalItems: v.number(),
});

const namedSlugRefSchema = v.object({
  name: v.string(),
  slug,
});

const slugWithPoemCountSchema = v.object({
  name: v.string(),
  slug,
  poemsCount: v.number(),
});

export const listBodySchema = v.object({
  data: v.array(v.unknown()),
  pagination: paginationSchema,
  meta: v.optional(slugWithPoemCountSchema),
});

export const slugListResponseSchema = v.object({
  data: v.array(v.string()),
  pagination: paginationSchema,
});

export const poemDetailResponseSchema = v.object({
  data: v.object({
    title: v.string(),
    slug,
    poet: namedSlugRefSchema,
    meter: namedSlugRefSchema,
    theme: namedSlugRefSchema,
    era: namedSlugRefSchema,
    relatedPoems: v.array(
      v.object({
        title: v.string(),
        slug,
        poet: namedSlugRefSchema,
        meter: namedSlugRefSchema,
      })
    ),
  }),
});

export const searchBodySchema = v.object({
  searchType: v.union([v.literal('poems'), v.literal('poets')]),
  data: v.array(
    v.object({
      type: v.string(),
      slug: v.optional(slug),
    })
  ),
  pagination: paginationSchema,
});

export const problemDetailSchema = v.object({
  code: v.string(),
  type: v.string(),
  title: v.string(),
  status: v.number(),
  instance: v.optional(v.string()),
  detail: v.optional(v.string()),
  errors: v.optional(
    v.array(
      v.object({
        path: v.optional(v.string()),
        message: v.string(),
      })
    )
  ),
});
