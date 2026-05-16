import * as v from 'valibot';

export const poemSlugSchema = v.pipe(v.string(), v.brand('PoemSlug'));
export type PoemSlug = v.InferOutput<typeof poemSlugSchema>;

export const poetSlugSchema = v.pipe(v.string(), v.brand('PoetSlug'));
export type PoetSlug = v.InferOutput<typeof poetSlugSchema>;

export const meterSlugSchema = v.pipe(v.string(), v.brand('MeterSlug'));
export type MeterSlug = v.InferOutput<typeof meterSlugSchema>;

export const eraSlugSchema = v.pipe(v.string(), v.brand('EraSlug'));
export type EraSlug = v.InferOutput<typeof eraSlugSchema>;

export const themeSlugSchema = v.pipe(v.string(), v.brand('ThemeSlug'));
export type ThemeSlug = v.InferOutput<typeof themeSlugSchema>;

export const rhymeSlugSchema = v.pipe(v.string(), v.brand('RhymeSlug'));
export type RhymeSlug = v.InferOutput<typeof rhymeSlugSchema>;
