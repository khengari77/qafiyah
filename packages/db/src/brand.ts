import type {
  CollectionSlug,
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  RhymeSlug,
  ThemeSlug,
} from '@qafiyah/contracts';

// @WARN: type-only brand wrappers. SQL columns return plain strings; these helpers
//   re-tag them as the appropriate slug brand without runtime validation. The brand
//   has no runtime properties, these casts are concentrated here so per-call sites
//   stay clean. Only use on values known to come from a trusted SQL column.
export const asEraSlug = (value: string): EraSlug => value as EraSlug;
export const asMeterSlug = (value: string): MeterSlug => value as MeterSlug;
export const asPoemSlug = (value: string): PoemSlug => value as PoemSlug;
export const asPoetSlug = (value: string): PoetSlug => value as PoetSlug;
export const asRhymeSlug = (value: string): RhymeSlug => value as RhymeSlug;
export const asThemeSlug = (value: string): ThemeSlug => value as ThemeSlug;
export const asCollectionSlug = (value: string): CollectionSlug => value as CollectionSlug;
