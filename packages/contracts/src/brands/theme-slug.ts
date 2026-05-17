import * as v from 'valibot';

export const themeSlugSchema = v.pipe(v.string(), v.brand('ThemeSlug'));
export type ThemeSlug = v.InferOutput<typeof themeSlugSchema>;
