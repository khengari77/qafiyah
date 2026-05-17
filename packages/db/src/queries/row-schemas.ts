import { meterSlugSchema, poemSlugSchema, poetSlugSchema } from '@qafiyah/contracts';
import * as v from 'valibot';

export const parentRowSchema = v.object({
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
