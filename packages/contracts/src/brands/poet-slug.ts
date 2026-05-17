import * as v from 'valibot';

export const poetSlugSchema = v.pipe(v.string(), v.brand('PoetSlug'));
export type PoetSlug = v.InferOutput<typeof poetSlugSchema>;
