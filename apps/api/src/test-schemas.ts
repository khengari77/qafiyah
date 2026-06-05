/**
 * Minimal Valibot schemas used to validate response bodies in tests.
 * Replaces ad-hoc `(await res.json()) as ListBody` casts.
 *
 * Shapes are built from `@qafiyah/contracts` so tests stay in lockstep with the
 * wire contract. The local `slug = v.string()` keeps slug validation loose
 * (unbranded) — tests only need to confirm the field is present, not that it
 * matches a brand.
 */

import { namedSlugRef, pagination, slugWithPoemCount } from '@qafiyah/contracts';
import * as v from 'valibot';

const slug = v.string();
const looseNamedSlugRef = namedSlugRef(slug);

export const listBodySchema = v.object({
  data: v.array(v.unknown()),
  pagination,
  meta: v.optional(slugWithPoemCount(slug)),
});

export const slugListResponseSchema = v.object({
  data: v.array(v.string()),
  pagination,
});

export const countResponseSchema = v.object({
  data: v.object({ total: v.number() }),
});

export const poemDetailResponseSchema = v.object({
  data: v.object({
    title: v.string(),
    slug,
    poet: looseNamedSlugRef,
    meter: looseNamedSlugRef,
    theme: looseNamedSlugRef,
    era: looseNamedSlugRef,
    relatedPoems: v.array(
      v.object({
        title: v.string(),
        slug,
        poet: looseNamedSlugRef,
        meter: looseNamedSlugRef,
      })
    ),
  }),
});

const section = v.object({
  data: v.array(v.object({ type: v.string(), slug: v.optional(slug) })),
  pagination,
});

export const groupedSearchBodySchema = v.object({
  q: v.string(),
  poems: v.nullable(section),
  poets: v.nullable(section),
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
