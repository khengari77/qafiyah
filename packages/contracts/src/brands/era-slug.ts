import * as v from 'valibot';

export const eraSlugSchema = v.pipe(v.string(), v.brand('EraSlug'));
export type EraSlug = v.InferOutput<typeof eraSlugSchema>;
