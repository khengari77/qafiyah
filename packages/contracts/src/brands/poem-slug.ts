import * as v from 'valibot';

export const poemSlugSchema = v.pipe(v.string(), v.brand('PoemSlug'));
export type PoemSlug = v.InferOutput<typeof poemSlugSchema>;
