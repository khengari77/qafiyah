import type { MeterSlug, PoemSlug, PoetSlug } from '@qafiyah/contracts';
import { meterSlugSchema, poemSlugSchema, poetSlugSchema } from '@qafiyah/contracts';
import * as v from 'valibot';

export const parentStatsRowSchema = v.object({
  name: v.string(),
  poems_count: v.union([v.number(), v.string()]),
});

export const rawPoemRowSchema = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  poet_name: v.string(),
  poet_slug: poetSlugSchema,
  meter_name: v.string(),
  meter_slug: meterSlugSchema,
});

// Types intentionally inferred at use sites via v.InferOutput<typeof ...Schema>;
// keeping them un-exported avoids unused-export churn.

export type PoemListRow = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poetName: string;
  readonly poetSlug: PoetSlug;
  readonly meterName: string;
  readonly meterSlug: MeterSlug;
};
