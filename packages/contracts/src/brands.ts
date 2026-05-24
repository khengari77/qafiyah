import * as v from 'valibot';

const TRANSLITERATED_SLUG_REGEX = /^[a-z][a-z-]*$/;
const TRANSLITERATED_SLUG_MESSAGE = 'slug must be lowercase letters and hyphens';

export const eraSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('EraSlug')
);
export type EraSlug = v.InferOutput<typeof eraSlugSchema>;

export const meterSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('MeterSlug')
);
export type MeterSlug = v.InferOutput<typeof meterSlugSchema>;

export const poemSlugSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z]{4}$/, 'poem slug must be exactly 4 letters'),
  v.brand('PoemSlug')
);
export type PoemSlug = v.InferOutput<typeof poemSlugSchema>;

export const poetSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('PoetSlug')
);
export type PoetSlug = v.InferOutput<typeof poetSlugSchema>;

export const rhymeSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('RhymeSlug')
);
export type RhymeSlug = v.InferOutput<typeof rhymeSlugSchema>;

export const themeSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('ThemeSlug')
);
export type ThemeSlug = v.InferOutput<typeof themeSlugSchema>;

export const collectionSlugSchema = v.pipe(
  v.string(),
  v.regex(TRANSLITERATED_SLUG_REGEX, TRANSLITERATED_SLUG_MESSAGE),
  v.brand('CollectionSlug')
);
export type CollectionSlug = v.InferOutput<typeof collectionSlugSchema>;
