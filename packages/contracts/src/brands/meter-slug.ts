import * as v from 'valibot';

export const meterSlugSchema = v.pipe(v.string(), v.brand('MeterSlug'));
export type MeterSlug = v.InferOutput<typeof meterSlugSchema>;
