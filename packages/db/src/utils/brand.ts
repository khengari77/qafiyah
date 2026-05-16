import type {
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  RhymeSlug,
  ThemeSlug,
} from '@qafiyah/contracts';

// @WARN: type-only brand wrappers. SQL columns return plain strings; these helpers
//   re-tag them as the appropriate slug brand without runtime validation. The brand
//   has no runtime properties — these casts are concentrated here so per-call sites
//   stay clean. Only use on values known to come from a trusted SQL column.
export const asEraSlug = (s: string): EraSlug => s as EraSlug;
export const asMeterSlug = (s: string): MeterSlug => s as MeterSlug;
export const asPoemSlug = (s: string): PoemSlug => s as PoemSlug;
export const asPoetSlug = (s: string): PoetSlug => s as PoetSlug;
export const asRhymeSlug = (s: string): RhymeSlug => s as RhymeSlug;
export const asThemeSlug = (s: string): ThemeSlug => s as ThemeSlug;
