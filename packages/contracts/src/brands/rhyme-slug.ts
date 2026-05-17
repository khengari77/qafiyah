import * as v from 'valibot';

export const rhymeSlugSchema = v.pipe(v.string(), v.brand('RhymeSlug'));
export type RhymeSlug = v.InferOutput<typeof rhymeSlugSchema>;
