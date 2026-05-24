import * as v from 'valibot';

export const eraSlugSchema = v.pipe(v.string(), v.brand('EraSlug'));
export type EraSlug = v.InferOutput<typeof eraSlugSchema>;

export const meterSlugSchema = v.pipe(v.string(), v.brand('MeterSlug'));
export type MeterSlug = v.InferOutput<typeof meterSlugSchema>;

export const poemSlugSchema = v.pipe(v.string(), v.brand('PoemSlug'));
export type PoemSlug = v.InferOutput<typeof poemSlugSchema>;

export const poetSlugSchema = v.pipe(v.string(), v.brand('PoetSlug'));
export type PoetSlug = v.InferOutput<typeof poetSlugSchema>;

export const rhymeSlugSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z][a-z-]*$/, 'rhyme slug must be lowercase letters and hyphens'),
  v.brand('RhymeSlug')
);
export type RhymeSlug = v.InferOutput<typeof rhymeSlugSchema>;

export const themeSlugSchema = v.pipe(v.string(), v.brand('ThemeSlug'));
export type ThemeSlug = v.InferOutput<typeof themeSlugSchema>;

export const collectionSlugSchema = v.pipe(v.string(), v.brand('CollectionSlug'));
export type CollectionSlug = v.InferOutput<typeof collectionSlugSchema>;
